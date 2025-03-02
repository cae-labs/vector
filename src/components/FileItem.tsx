import { useState, useEffect, MouseEvent } from 'react';
import { FileEntry } from '@/hooks/useFileSystem';
import { platform } from '@tauri-apps/plugin-os';

interface FileItemProps {
	file: FileEntry;
	onOpen: (file: FileEntry) => void;
	onSelect: (file: FileEntry) => void;
	onDelete: (path: string) => void;
	onRename: (file: FileEntry) => void;
	onContextMenu: (event: MouseEvent, file: FileEntry) => void;
	isRenaming: boolean;
	isSelected: boolean;
	newName: string;
	setNewName: (name: string) => void;
	onSaveRename: () => void;
	onCancelRename: () => void;
}

export function FileItem({
	file,
	onOpen,
	onSelect,
	onDelete,
	onRename,
	onContextMenu,
	isRenaming,
	isSelected,
	newName,
	setNewName,
	onSaveRename,
	onCancelRename
}: FileItemProps) {
	const [isMacOS, setIsMacOS] = useState(false);

	useEffect(() => {
		setIsMacOS(platform() === 'macos');
	}, []);

	const formatFileSize = (size: number): string => {
		if (size < 1024) return `${size} B`;
		if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
		if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
		return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
	};

	const displayName = () => {
		if (isMacOS && file.name.endsWith('.app')) {
			return file.name.slice(0, -4);
		}
		return file.name;
	};

	const getFileIcon = () => {
		if (file.is_dir) return '📁';

		const iconMap: Record<string, string> = {
			pdf: '📄',
			doc: '📝',
			docx: '📝',
			xls: '📊',
			xlsx: '📊',
			ppt: '📊',
			pptx: '📊',
			jpg: '🖼️',
			jpeg: '🖼️',
			png: '🖼️',
			gif: '🖼️',
			mp3: '🎵',
			mp4: '🎬',
			zip: '🗜️',
			rar: '🗜️',
			txt: '📝',
			json: '📋',
			js: '📜',
			jsx: '📜',
			ts: '📜',
			tsx: '📜',
			css: '🎨',
			html: '🌐'
		};

		return iconMap[file.file_type.toLowerCase()] || '📄';
	};

	return (
		<div
			className={`cursor-default flex items-center p-2 border-b ${isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'} ${file.is_hidden ? 'opacity-60' : ''}`}
			onContextMenu={(e) => onContextMenu(e, file)}
			onClick={() => onSelect(file)}
			onDoubleClick={() => onOpen(file)}>
			<div className="mr-2 text-xl">{getFileIcon()}</div>

			{isRenaming ? (
				<div className="flex flex-1 items-center">
					<input
						type="text"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						className="flex-1 p-1 border rounded"
						autoFocus
						onKeyDown={(e) => {
							if (e.key === 'Enter') onSaveRename();
							if (e.key === 'Escape') onCancelRename();
						}}
					/>
					<button onClick={onSaveRename} className="ml-2 px-2 py-1 bg-blue-500 text-white rounded text-xs">
						Save
					</button>
					<button onClick={onCancelRename} className="ml-2 px-2 py-1 bg-gray-500 text-white rounded text-xs">
						Cancel
					</button>
				</div>
			) : (
				<>
					<div className={`flex-1 ${file.is_hidden ? 'text-gray-500 italic' : ''}`}>{displayName()}</div>
					<div className="text-gray-500 text-sm mr-4 hidden md:block">{file.modified}</div>
					<div className="text-gray-500 text-sm w-20 text-right">{file.is_dir ? '--' : formatFileSize(file.size)}</div>
				</>
			)}
		</div>
	);
}
