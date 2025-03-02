import { KeybindBadge } from '@/components/Badge';

interface StatusBarProps {
	files: FileEntry[];
	currentPath: string;
}

export function StatusBar({ files, currentPath }: StatusBarProps) {
	return (
		<div className="mt-11 sticky bottom-0 cursor-default bg-gray-100 px-2.5 py-1.5 border-t border-gray-300 text-xs text-gray-500 flex justify-between">
			{/* make the currentPath navigateble  */}
			<span className="text-xs text-gray-500">{currentPath == 'internal:trash' ? 'Trash' : currentPath}</span>
			<span>{files.length === 1 ? '1 item' : `${files.length} items`}</span>
		</div>
	);
}
