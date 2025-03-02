import { ChevronRight, ChevronLeft, CornerRightUp } from 'lucide-react';

interface NavigationBarProps {
	currentPath: string;
	onBack: () => void;
	onForward: () => void;
	onNavigateUp: () => void;
	canGoBack: boolean;
	canNavigateUp: boolean | null;
	canGoForward: boolean;
}

export function Navbar({ currentPath, onBack, onForward, onNavigateUp, canGoBack, canGoForward, canNavigateUp = true }: NavigationBarProps) {
	const getCurrentDirName = () => {
		const parts = currentPath.split(/[/\\]/);
		for (let i = parts.length - 1; i >= 0; i--) {
			if (parts[i]) return parts[i];
		}
		return currentPath.match(/^[A-Za-z]:/) ? currentPath.slice(0, 2) : '/';
	};

	return (
		<div
			data-tauri-drag-region
			className="flex items-center p-1.5 bg-stone-200 dark:bg-stone-700/70 border-b border-stone-400 dark:border-black cursor-default">
			<div className="ml-1 flex items-center">
				<button
					onClick={onBack}
					disabled={!canGoBack}
					className={`p-1 my-0.5 rounded-md mr-1 ${canGoBack ? 'text-stone-700 hover:bg-stone-300 dark:text-stone-400 dark:hover:bg-stone-600/50' : 'text-stone-400 dark:text-stone-600'}`}
					title="Back">
					<ChevronLeft size={20} />
				</button>
				<button
					onClick={onForward}
					disabled={!canGoForward}
					className={`p-1 my-0.5 rounded-md mr-3 ${canGoForward ? 'text-stone-700 hover:bg-stone-300 dark:text-stone-400 dark:hover:bg-stone-600/50' : 'text-stone-400 dark:text-stone-600'}`}
					title="Forward">
					<ChevronRight size={20} />
				</button>
				{canNavigateUp && currentPath != '/' && (
					<button
						onClick={onNavigateUp}
						className="p-1 my-0.5 rounded-md mr-3 text-stone-700 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-600/50"
						title="Go to parent directory">
						<CornerRightUp size={20} />
					</button>
				)}
			</div>

			<div className="font-medium text-md dark:text-stone-100">{getCurrentDirName()}</div>
		</div>
	);
}
