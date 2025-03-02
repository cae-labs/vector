import { platform } from '@tauri-apps/plugin-os';
import { KeybindBadge } from '@/components/Badge';
import { useState, useEffect } from 'react';

interface StatusBarProps {
	files: FileEntry[];
	currentPath: string;
	showHidden: boolean;
}

const FileManagerToggle = ({ showHidden, isMacOS }) => {
	const keybind = isMacOS ? '⌘+H' : 'Ctrl+H';
	const message = showHidden ? 'Showing hidden' : 'Hidden files not shown';

	return (
		<div className="flex items-center space-x-2">
			<span>{message}</span>
			<KeybindBadge>{keybind}</KeybindBadge>
		</div>
	);
};

export function StatusBar({ files, currentPath, showHidden }: StatusBarProps) {
	const [isMacOS, setIsMacOS] = useState(false);

	useEffect(() => {
		setIsMacOS(platform() === 'macos');
	}, []);

	return (
		<div className="sticky bottom-0 cursor-default bg-gray-100 px-2.5 py-1.5 border-t text-xs text-gray-500 flex justify-between">
			{/* make the currentPath navigateble  */}
			{currentPath == 'internal:trash' ? (
				<span>{files.length === 1 ? '1 item in Trash' : `${files.length} items in Trash`}</span>
			) : (
				<span>
					{files.length} items <span className="text-[10px] text-gray-400">{currentPath}</span>
				</span>
			)}
			<FileManagerToggle showHidden={showHidden} isMacOS={isMacOS} />
		</div>
	);
}
