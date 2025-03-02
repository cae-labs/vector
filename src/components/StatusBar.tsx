import { useState, useEffect } from 'react';
import { platform } from '@tauri-apps/plugin-os';
import { ChevronRight } from 'lucide-react';

interface StatusBarProps {
	files: FileEntry[];
	currentPath: string;
	onNavigate: (path: string) => void;
}

export function StatusBar({ files, currentPath, onNavigate }: StatusBarProps) {
	const [currentPlatform, setPlatform] = useState<string | null>(null);

	useEffect(() => {
		async function getPlatform() {
			const plat = await platform();
			setPlatform(plat);
		}
		getPlatform();
	}, []);

	const getRootName = () => {
		if (!currentPlatform) return '/';
		if (currentPlatform === 'macos') return 'My Mac';
		if (currentPlatform === 'windows') return 'My PC';
		return 'root';
	};

	const pathSegments = currentPath !== 'internal:trash' ? currentPath.split('/').filter(Boolean) : [];

	return (
		<div className="mt-11 sticky bottom-0 cursor-default bg-stone-100 dark:bg-stone-800 px-2.5 py-1 border-t border-stone-300 dark:border-stone-700 text-[11px] text-stone-500 dark:text-stone-500/70 flex justify-between">
			<div className="flex items-center">
				{currentPath === 'internal:trash' ? (
					<span className="text-[11px] text-stone-500 dark:text-stone-500/70">Trash</span>
				) : (
					<>
						{pathSegments.length > 0 ? (
							<>
								<span className="hover:text-stone-700 dark:hover:text-stone-400 cursor-pointer" onClick={() => onNavigate('/')}>
									{getRootName()}
								</span>
								{pathSegments.map((segment, index) => {
									const pathToSegment = '/' + pathSegments.slice(0, index + 1).join('/');
									return (
										<span key={index}>
											<span className="mx-0.5">
												<ChevronRight className="inline" size={10} />
											</span>
											<span className="hover:text-stone-700 dark:hover:text-stone-400 cursor-pointer" onClick={() => onNavigate(pathToSegment)}>
												{segment}
											</span>
										</span>
									);
								})}
							</>
						) : (
							<span className="hover:text-stone-700 dark:hover:text-stone-400 cursor-pointer" onClick={() => onNavigate('/')}>
								{getRootName()}
							</span>
						)}
					</>
				)}
			</div>
			<span>{files.length === 1 ? '1 item' : `${files.length} items`}</span>
		</div>
	);
}
