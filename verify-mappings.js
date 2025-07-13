#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 Simple Git Message Rewriter');
console.log('==============================');

// Read JSON file
const jsonData = JSON.parse(fs.readFileSync('git-commits.json', 'utf8'));

// Create a mapping
const messageMap = {};
jsonData.commits.forEach(commit => {
    messageMap[commit.hash] = commit.message;
});

console.log(`📝 Loaded ${jsonData.commits.length} commit message mappings`);

// First, let's just show what we would change
console.log('\n📋 Proposed changes:');
console.log('===================');

// Get current commit messages
try {
    const commits = execSync('git log --format="%h|%s" --reverse', { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(line => line.length > 0);

    let changesCount = 0;
    commits.forEach(line => {
        const [hash, currentMessage] = line.split('|');
        if (messageMap[hash]) {
            console.log(`${hash}: "${currentMessage}" → "${messageMap[hash]}"`);
            changesCount++;
        }
    });

    console.log(`\n✅ Found ${changesCount} commits that will be updated`);
    
    if (changesCount === 0) {
        console.log('❌ No matching commits found! Check if commit hashes match.');
        process.exit(1);
    }

    // Ask for confirmation
    console.log('\nTo proceed with the actual rewrite, we need to use a more reliable method.');
    console.log('Due to Windows compatibility issues with git filter-branch, I recommend:');
    console.log('');
    console.log('1. Manual rebase: git rebase -i --root');
    console.log('2. For each commit, change "pick" to "reword"');
    console.log('3. Use the mappings shown above');
    console.log('');
    console.log('Alternatively, try the upcoming experimental PowerShell approach...');
    
} catch (error) {
    console.error('❌ Error reading git history:', error.message);
}

console.log('\n🎯 Commit mapping ready for manual use!');
