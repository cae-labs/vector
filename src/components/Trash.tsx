import { useState, useEffect } from 'react';
import { FileEntry } from '@/hooks/useFileSystem';
import { TrashList } from '@/components/TrashList';
import { invoke } from '@tauri-apps/api/core';

interface TrashProps {
	showHidden: boolean;
	onTrashUpdate?: () => void;
	setShowTrash: (show: boolean) => void;
}

export function Trash({ showHidden, onTrashUpdate, setShowTrash }: TrashProps) {
	const [items, setItems] = useState<FileEntry[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const loadTrashItems = async () => {
		try {
			setIsLoading(true);
			const trashItems = await invoke<FileEntry[]>('get_trash_items');
			setItems(trashItems);
			onTrashUpdate?.();
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
			const wasLastItem = items.length === 1;

			await loadTrashItems();
			onTrashUpdate?.();

			if (wasLastItem) {
				setShowTrash(false);
			}
		} catch (err) {
			console.error(err);
			setError(err instanceof Error ? err.message : 'Failed to restore item');
		}
	};

	const handlePermanentDelete = async (path: string) => {
		try {
			await invoke('delete_item', { path });
			const wasLastItem = items.length === 1;

			await loadTrashItems();
			onTrashUpdate?.();

			if (wasLastItem) {
				setShowTrash(false);
			}
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
		<TrashList
			files={items}
			restoreFromTrash={handleRestore}
			permanentlyDelete={handlePermanentDelete}
			showHidden={showHidden}
			onToggleHidden={() => {}}
		/>
	);
}
