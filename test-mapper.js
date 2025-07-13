// Create a mapping from commit hashes to new messages
const commitMap = {
    "ec7ba76": "fix: clipping mask not visible in exported shapes",
    "a5e195c": "fix: resolve onReleaseMask function undefined error",
    "67cfa54": "refactor: implement requested UI improvements"
};

// Read the original message from stdin
const fs = require('fs');
let originalMessage = '';

if (process.stdin.isTTY) {
    // If running from terminal, get message from env
    originalMessage = process.env.GIT_MSG || 'test message';
} else {
    // Read from stdin
    originalMessage = fs.readFileSync(0, 'utf-8').trim();
}

// Get the commit hash from environment
const commitHash = process.env.GIT_COMMIT;

console.log(`Original: ${originalMessage}`);
console.log(`Hash: ${commitHash}`);

// Find the corresponding new message or use original
const newMessage = commitMap[commitHash] || originalMessage;

console.log(`Result: ${newMessage}`);
