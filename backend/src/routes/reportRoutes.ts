import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

const SCRIPTS_DIR = path.join(__dirname, '..', '..', '..', 'scripts');
const REPORTS_DIR = path.join(__dirname, '..', '..', '..', 'reports');

/**
 * Utility: run a Python script and capture its stdout output.
 * Resolves with { success, data, output } or rejects on error.
 */
function runPython(scriptName: string, args: string[] = []): Promise<{ success: boolean; data: any; rawOutput: string }> {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(SCRIPTS_DIR, scriptName);
        const proc = spawn('python', [scriptPath, ...args]);

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
        proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

        proc.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Python script exited with code ${code}: ${stderr}`));
                return;
            }

            // Parse the special JSON marker line emitted by Python scripts
            let parsedData: any = null;
            const jsonLine = stdout.split('\n').find(line =>
                line.startsWith('REPORT_JSON:') || line.startsWith('SCHEDULE_JSON:')
            );
            if (jsonLine) {
                const jsonStr = jsonLine.replace(/^(REPORT_JSON:|SCHEDULE_JSON:)/, '');
                try { parsedData = JSON.parse(jsonStr); } catch { /* ignore */ }
            }

            resolve({ success: true, data: parsedData, rawOutput: stdout });
        });

        proc.on('error', reject);
    });
}

// @route  POST /api/reports/generate
// @desc   Run Python reporter and return task summary JSON
// @access Private
router.post('/generate', authenticate, async (req: Request, res: Response) => {
    try {
        const { user_id } = req.body;
        const args = user_id ? ['--user_id', String(user_id)] : [];
        const result = await runPython('generate_report.py', args);
        res.json({ message: 'Report generated', report: result.data });
    } catch (err) {
        console.error('[Report Error]', err);
        res.status(500).json({ message: 'Failed to generate report', error: String(err) });
    }
});

// @route  POST /api/reports/schedule
// @desc   Run the task scheduling algorithm and return the schedule
// @access Private
router.post('/schedule', authenticate, async (req: Request, res: Response) => {
    try {
        const slots = req.body.slots || 4;
        const result = await runPython('task_scheduler.py', ['--slots', String(slots)]);
        res.json({ message: 'Schedule generated', schedule: result.data });
    } catch (err) {
        console.error('[Schedule Error]', err);
        res.status(500).json({ message: 'Failed to generate schedule', error: String(err) });
    }
});

// @route  GET /api/reports/latest
// @desc   Read the most recent JSON report from disk (no re-run needed)
// @access Private
router.get('/latest', authenticate, async (req: Request, res: Response) => {
    try {
        const reportPath = path.join(REPORTS_DIR, 'report.json');
        if (!fs.existsSync(reportPath)) {
            res.status(404).json({ message: 'No report found. Please generate one first.' });
            return;
        }
        const data = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: 'Error reading report', error: String(err) });
    }
});

// @route  GET /api/reports/csv
// @desc   Download the generated CSV report
// @access Private
router.get('/csv', authenticate, (req: Request, res: Response) => {
    const csvPath = path.join(REPORTS_DIR, 'task_report.csv');
    if (!fs.existsSync(csvPath)) {
        res.status(404).json({ message: 'No CSV found. Generate a report first.' });
        return;
    }
    res.download(csvPath, 'task_report.csv');
});

export default router;
