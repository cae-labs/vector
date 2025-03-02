interface NavigationBarProps {
	currentPath: string;
	onBack: () => void;
	onForward: () => void;
	onNavigateUp: () => void;
	canGoBack: boolean;
	canGoForward: boolean;
}

export function Navbar({ currentPath, onBack, onForward, onNavigateUp, canGoBack, canGoForward }: NavigationBarProps) {
	const getCurrentDirName = () => {
		const parts = currentPath.split(/[/\\]/);
		for (let i = parts.length - 1; i >= 0; i--) {
			if (parts[i]) return parts[i];
		}
		return currentPath.match(/^[A-Za-z]:/) ? currentPath.slice(0, 2) : '/';
	};

	return (
		<div className="flex items-center p-2 bg-gray-100 border-b cursor-default">
			<div className="flex items-center">
				<button
					onClick={onBack}
					disabled={!canGoBack}
					className={`p-2 rounded-full mr-1 ${canGoBack ? 'text-gray-700 hover:bg-gray-200' : 'text-gray-400'}`}
					title="Back">
					<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
					className={`p-2 rounded-full mr-3 ${canGoForward ? 'text-gray-700 hover:bg-gray-200' : 'text-gray-400'}`}
					title="Forward">
					<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path
							fillRule="evenodd"
							d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
							clipRule="evenodd"
						/>
					</svg>
				</button>

				<button onClick={onNavigateUp} className="p-2 rounded-full mr-3 text-gray-700 hover:bg-gray-200" title="Go to parent directory">
					<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
						<path
							fillRule="evenodd"
							d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
							clipRule="evenodd"
						/>
					</svg>
				</button>
			</div>

			<div className="font-medium text-lg">{getCurrentDirName()}</div>
		</div>
	);
}
