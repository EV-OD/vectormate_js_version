'use client';

import React, { useState } from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type PromptBarProps = {
    onPromptSubmit: (prompt: string) => void;
    disabled?: boolean;
}

export function PromptBar({ onPromptSubmit, disabled }: PromptBarProps) {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (prompt.trim() && !disabled) {
            onPromptSubmit(prompt);
            setPrompt('');
        }
    };

    return (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-10">
            <form 
                onSubmit={handleSubmit}
                className="relative flex items-center p-1.5 pl-5 bg-card/80 backdrop-blur-sm border rounded-full shadow-2xl shadow-primary/20"
                style={{
                    boxShadow: `0 0 8px hsl(var(--primary)/.3), 0 0 20px hsl(var(--primary)/.2), inset 0 0 1px 1px hsl(var(--border))`
                }}
            >
                <Sparkles className={cn("w-5 h-5 text-primary/80", disabled && "animate-neon-pulse")} />
                <Input
                    type="text"
                    placeholder="Describe what you want to create..."
                    className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    disabled={disabled}
                />
                <Button 
                    type="submit" 
                    size="icon" 
                    className="w-9 h-9 rounded-full" 
                    disabled={disabled || !prompt.trim()}
                >
                    <Sparkles className={cn("w-5 h-5", disabled && "animate-neon-pulse")} />
                </Button>
            </form>
        </div>
    );
}
