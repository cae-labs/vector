import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FileEntry } from '@/types/file';

export function Trash() {
	const [items, setItems] = useState<FileEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadTrashItems = async () => {
		try {
			setIsLoading(true);
			const trashItems = await invoke<FileEntry[]>('get_trash_items');
			setItems(trashItems);
		} catch (err) {
			console.log(err);
			setError(err instanceof Error ? err.message : 'Failed to load trash items');
		} finally {
			setIsLoading(false);
		}
	};

	const handleRestore = async (path: string) => {
		try {
			await invoke('restore_from_trash', { path });
			await loadTrashItems();
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Failed to restore item');
		}
	};

	useEffect(() => {
		loadTrashItems();
	}, []);

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-gray-500">Loading trash items...</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex-1 p-4">
				<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-full">
			<div className="flex items-center justify-between p-4 border-b">
				<h1 className="text-xl font-semibold">Trash</h1>
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				{items.length === 0 ? (
					<div className="text-center text-gray-500 mt-8">
						<p>Trash is empty</p>
					</div>
				) : (
					<div className="space-y-2">
						{items.map((item) => (
							<div key={item.path} className="flex items-center justify-between p-3 bg-white rounded-lg border hover:bg-gray-50">
								<div className="flex items-center space-x-3">
									<span className="text-gray-400">{item.is_dir ? '📁' : '📄'}</span>
									<span className="text-sm">{item.name}</span>
								</div>
								<button onClick={() => handleRestore(item.path)} className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100">
									Restore
								</button>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
