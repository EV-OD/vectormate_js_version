#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

console.log('🔄 Git Commit Message Updater');
console.log('==============================');

// Load JSON data
console.log('📄 Loading commit mappings...');
const jsonData = JSON.parse(fs.readFileSync('git-commits.json', 'utf8'));
console.log(`✅ Loaded ${jsonData.commits.length} commit mappings`);

// Create backup branch first
try {
    execSync('git branch backup-original-commits-2', { stdio: 'pipe' });
    console.log('✅ Created backup branch: backup-original-commits-2');
} catch (error) {
    console.log('⚠️  Backup branch already exists or could not be created');
}

// Set up for git filter-branch
console.log('🔄 Setting up git filter-branch...');

// Create a simple mapping script for Windows compatibility
const mappingScript = `
const commitMap = {
${jsonData.commits.map(commit => `    "${commit.hash}": "${commit.message.replace(/"/g, '\\"')}"`).join(',\n')}
};

const fs = require('fs');
let originalMessage = '';

try {
    originalMessage = fs.readFileSync(0, 'utf-8').trim();
} catch (error) {
    originalMessage = process.env.GIT_MSG || '';
}

const commitHash = process.env.GIT_COMMIT;
const newMessage = commitMap[commitHash] || originalMessage;
console.log(newMessage);
`;

const scriptPath = path.resolve('msg-filter.js');
fs.writeFileSync(scriptPath, mappingScript);

try {
    console.log('🚀 Running git filter-branch...');
    
    // Set environment variable to suppress warnings
    process.env.FILTER_BRANCH_SQUELCH_WARNING = '1';
    
    // Run git filter-branch
    execSync(`git filter-branch -f --msg-filter "node \\"${scriptPath}\\"" -- --all`, {
        stdio: 'inherit'
    });
    
    console.log('✅ Successfully updated commit messages!');
    
    // Clean up
    fs.unlinkSync(scriptPath);
    console.log('🧹 Cleaned up temporary files');
    
    // Show updated commits
    console.log('\n📜 Updated commits (last 5):');
    const updatedCommits = execSync('git log --format="%h %s" -5', { encoding: 'utf8' });
    console.log(updatedCommits);
    
    console.log('\n🎉 Success! All commit messages have been updated to professional format.');
    console.log('💾 Your original commits are backed up in "backup-original-commits-2" branch');
    
} catch (error) {
    console.error('❌ Error during git filter-branch:', error.message);
    
    // Clean up on error
    try {
        fs.unlinkSync(scriptPath);
    } catch (e) {}
    
    console.log('💾 Your original commits are safe in the backup branch');
    process.exit(1);
}
