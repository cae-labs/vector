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
			<div className="flex items-center">
				<button
					onClick={onBack}
					disabled={!canGoBack}
					className={`p-1 my-0.5 rounded-md mr-1 ${canGoBack ? 'text-stone-700 hover:bg-stone-300 dark:text-stone-400 dark:hover:bg-stone-600/50' : 'text-stone-400 dark:text-stone-600'}`}
					title="Back">
					<svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" viewBox="0 0 20 20" fill="currentColor">
						<path
							fillRule="evenodd"
							d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
							clipRule="evenodd"
						/>
					</svg>
				</button>
				<button
					onClick={onForward}
					disabled={!canGoForward}
					className={`p-1 my-0.5 rounded-md mr-3 ${canGoForward ? 'text-stone-700 hover:bg-stone-300 dark:text-stone-400 dark:hover:bg-stone-600/50' : 'text-stone-400 dark:text-stone-600'}`}
					title="Forward">
					<svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" viewBox="0 0 20 20" fill="currentColor">
						<path
							fillRule="evenodd"
							d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
							clipRule="evenodd"
						/>
					</svg>
				</button>
				{canNavigateUp && (
					<button
						onClick={onNavigateUp}
						className="p-1 my-0.5 rounded-md mr-3 text-stone-700 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-600/50"
						title="Go to parent directory">
						<svg xmlns="http://www.w3.org/2000/svg" className="h-5.5 w-5.5" viewBox="0 0 20 20" fill="currentColor">
							<path
								fillRule="evenodd"
								d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
								clipRule="evenodd"
							/>
						</svg>
					</button>
				)}
			</div>

			<div className="font-medium text-md dark:text-stone-100">{getCurrentDirName()}</div>
		</div>
	);
}
