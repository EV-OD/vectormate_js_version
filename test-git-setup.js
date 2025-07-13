#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔄 Starting Git Commit Message Updater...');

try {
    // Test git access
    console.log('📋 Checking git repository...');
    const gitStatus = execSync('git status --porcelain', { encoding: 'utf8' });
    console.log('✅ Git repository accessible');

    // Test JSON loading
    console.log('📄 Loading git-commits.json...');
    const jsonData = JSON.parse(fs.readFileSync('git-commits.json', 'utf8'));
    console.log(`✅ Loaded ${jsonData.commits.length} commit mappings`);

    // Show first few mappings
    console.log('📋 First few commit mappings:');
    jsonData.commits.slice(0, 3).forEach(commit => {
        console.log(`  ${commit.hash}: ${commit.message}`);
    });

    // Check current git commits
    console.log('📜 Current git commits (last 3):');
    const currentCommits = execSync('git log --format="%h %s" -3', { encoding: 'utf8' }).trim();
    console.log(currentCommits);

    console.log('\n🎯 Ready to proceed with git filter-branch!');
    console.log('Run with --execute flag to perform the actual rewrite');

} catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
}
