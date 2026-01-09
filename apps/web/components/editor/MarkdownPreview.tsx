'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownPreviewProps {
    content: string;
    className?: string;
}

export default function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
    return (
        <div className={`prose prose-sm max-w-none ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                    // Custom styling for elements
                    h1: ({ children }) => (
                        <h1 className="text-2xl font-bold text-gray-900 border-b pb-2 mb-4">{children}</h1>
                    ),
                    h2: ({ children }) => (
                        <h2 className="text-xl font-semibold text-gray-800 mt-6 mb-3">{children}</h2>
                    ),
                    h3: ({ children }) => (
                        <h3 className="text-lg font-medium text-gray-700 mt-4 mb-2">{children}</h3>
                    ),
                    p: ({ children }) => (
                        <p className="text-gray-700 leading-relaxed mb-3">{children}</p>
                    ),
                    ul: ({ children }) => (
                        <ul className="list-disc list-inside space-y-1 mb-3 text-gray-700">{children}</ul>
                    ),
                    ol: ({ children }) => (
                        <ol className="list-decimal list-inside space-y-1 mb-3 text-gray-700">{children}</ol>
                    ),
                    li: ({ children }) => (
                        <li className="text-gray-700">{children}</li>
                    ),
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-blue-400 pl-4 italic text-gray-600 my-4 bg-blue-50 py-2 rounded-r">
                            {children}
                        </blockquote>
                    ),
                    code: ({ children, className }) => {
                        const isInline = !className;
                        return isInline ? (
                            <code className="bg-gray-100 text-red-600 px-1 py-0.5 rounded text-sm font-mono">
                                {children}
                            </code>
                        ) : (
                            <code className="block bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono my-3">
                                {children}
                            </code>
                        );
                    },
                    table: ({ children }) => (
                        <div className="overflow-x-auto my-4">
                            <table className="min-w-full border-collapse border border-gray-300">
                                {children}
                            </table>
                        </div>
                    ),
                    th: ({ children }) => (
                        <th className="border border-gray-300 bg-gray-100 px-4 py-2 text-left font-semibold text-gray-700">
                            {children}
                        </th>
                    ),
                    td: ({ children }) => (
                        <td className="border border-gray-300 px-4 py-2 text-gray-700">
                            {children}
                        </td>
                    ),
                    strong: ({ children }) => (
                        <strong className="font-bold text-gray-900">{children}</strong>
                    ),
                    em: ({ children }) => (
                        <em className="italic text-gray-700">{children}</em>
                    ),
                    a: ({ href, children }) => (
                        <a href={href} className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                            {children}
                        </a>
                    ),
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
}
