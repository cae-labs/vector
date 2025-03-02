import { KeybindBadge } from '@/components/Badge';

interface StatusBarProps {
	files: FileEntry[];
	currentPath: string;
}

export function StatusBar({ files, currentPath }: StatusBarProps) {
	return (
		<div className="mt-11 sticky bottom-0 cursor-default bg-stone-100 dark:bg-stone-800 px-2.5 py-1 border-t border-stone-300 dark:border-stone-700 text-[11px] text-stone-500 dark:text-stone-500/70 flex justify-between">
			{/* make the currentPath navigateble  */}
			<span className="text-[11px] text-stone-500 dark:text-stone-500/70">
				{currentPath == 'internal:trash' ? 'Trash' : currentPath}
			</span>
			<span>{files.length === 1 ? '1 item' : `${files.length} items`}</span>
		</div>
	);
}
