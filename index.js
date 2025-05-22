const http = require('http');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const PORT = 3000;

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'todolist',
};

async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', (chunk) => body += chunk.toString());
        req.on('end', () => resolve(body));
        req.on('error', reject);
    });
}

async function getItems() {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT id, text FROM items ORDER BY id');
    await connection.end();
    return rows;
}

async function updateItem(id, newText) {
    const connection = await mysql.createConnection(dbConfig);
    await connection.execute('UPDATE items SET text = ? WHERE id = ?', [newText, id]);
    await connection.end();
}

async function generateTableRows() {
    const items = await getItems();
    return items.map((item, index) => `
        <tr data-id="${item.id}">
            <td>${index + 1}</td>
            <td>${item.text}</td>
        </tr>
    `).join('');
}

async function handleRequest(req, res) {
    const { url, method } = req;

    try {
        if (url === '/' && method === 'GET') {
            const html = await fs.promises.readFile(path.join(__dirname, 'index.html'), 'utf8');
            const processedHtml = html.replace('{{rows}}', await generateTableRows());
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(processedHtml);
        }
        else if (url === '/update' && method === 'PUT') {
            const body = await parseBody(req);
            const { id, newText } = JSON.parse(body);
            await updateItem(id, newText);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
        }
        else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
        }
    } catch (error) {
        console.error(error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Server Error' }));
    }
}

const server = http.createServer(handleRequest);
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));