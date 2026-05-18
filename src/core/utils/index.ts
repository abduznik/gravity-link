import { existsSync, readFileSync } from 'fs';

// Simple hash function
export function hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(36);
}

// Convert vscode-file:// URLs to base64 data URIs
export function convertVsCodeIcons(html: string): string {
    const transparentPixel = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';

    const toMimeType = (ext: string): string => {
        if (ext === 'svg') return 'image/svg+xml';
        if (/^(?:woff2?|ttf|otf|eot)$/.test(ext)) return `font/${ext}`;
        return `image/${ext === 'jpg' ? 'jpeg' : ext}`;
    };

    const inlineLocalPath = (rawPath: string): string => {
        try {
            if (!rawPath) return transparentPixel;
            let localPath = decodeURIComponent(rawPath).trim();
            localPath = localPath.replace(/^file:\/\/\/?/i, '');
            localPath = localPath.replace(/^\/([a-zA-Z]:\/)/, '$1');
            localPath = localPath.replace(/\\/g, '/');
            if (!/^[a-zA-Z]:\//.test(localPath)) return transparentPixel;
            if (!existsSync(localPath)) return transparentPixel;

            const content = readFileSync(localPath);
            const extension = localPath.split('.').pop()?.toLowerCase() || 'svg';
            const base64 = content.toString('base64');
            return `data:${toMimeType(extension)};base64,${base64}`;
        } catch {
            return transparentPixel;
        }
    };

    // Match vscode-file URLs like: vscode-file://vscode-app/c:/.../file.svg
    const vsCodeUrlRegex = /vscode-file:\/\/vscode-app\/?([^"'\s)]+\.(?:svg|png|jpe?g|gif|webp|woff2?|ttf|otf))(?:\?[^"'\s)]*)?/gi;
    // Match direct local-file references used by newer Antigravity builds.
    // The previous pattern (?:[\\/][^"'\s)])+ was broken: each iteration consumed only
    // sep+ONE_char, so multi-character directory names like /Users were never matched.
    // [^"'\s)]+ greedily consumes the whole path then backtracks to let \.ext match.
    const localAssetRegex = /(?:file:\/\/\/)?\/?([a-zA-Z]:[^"'\s)]+\.(?:svg|png|jpe?g|gif|webp|woff2?|ttf|otf))(?:\?[^"'\s)]*)?/gi;

    const withVsCodeIcons = html.replace(vsCodeUrlRegex, (match, filePath) => {
        try {
            // Normalise the captured URL path to a local filesystem path.
            // VS Code emits Windows drive paths as /C:/… (with a leading slash);
            // strip that leading slash so existsSync works on Windows.
            let localPath = decodeURIComponent(filePath);
            localPath = localPath.replace(/^\/([a-zA-Z]:\/)/, '$1');
            localPath = localPath.replace(/\\/g, '/');
            if (!/^[a-zA-Z]:\//.test(localPath)) return transparentPixel;

            if (!existsSync(localPath)) {
                return transparentPixel;
            }

            const content = readFileSync(localPath);
            const extension = localPath.split('.').pop()?.toLowerCase() || 'svg';
            const base64 = content.toString('base64');
            return `data:${toMimeType(extension)};base64,${base64}`;
        } catch {
            return transparentPixel;
        }
    });

    return withVsCodeIcons.replace(localAssetRegex, (_match, filePath) => inlineLocalPath(filePath));
}
