import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { FileEntry } from '@/hooks/useFileSystem';
import { FileList } from '@/components/FileList';

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
			console.error(err);
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
			console.error(err);
			setError(err instanceof Error ? err.message : 'Failed to restore item');
		}
	};

	const handlePermanentDelete = async (path: string) => {
		try {
			await invoke('permanently_delete_from_trash', { path });
			await loadTrashItems();
		} catch (err) {
			console.error(err);
			setError(err instanceof Error ? err.message : 'Failed to permanently delete item');
		}
	};

	useEffect(() => {
		loadTrashItems();
	}, []);

	if (isLoading) {
		return <div className="flex items-center justify-center h-full">Loading...</div>;
	}

	if (error) {
		return <div className="text-red-600 p-4">{error}</div>;
	}

	return (
		<div className="h-full">
			<FileList
				items={items}
				restoreFromTrash={handleRestore}
				permanentlyDelete={handlePermanentDelete}
				showHidden={false}
				onToggleHidden={() => {}}
			/>
		</div>
	);
}
