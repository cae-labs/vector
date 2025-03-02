import { useState, useEffect, MouseEvent } from 'react';
import { FileEntry } from '@/hooks/useFileSystem';
import { platform } from '@tauri-apps/plugin-os';

import {
	Folder,
	FolderGit2,
	File,
	FileText,
	FileJson,
	FileCode2,
	FilePenLine,
	FolderArchive,
	FileAudio,
	FileVideo,
	FileChartColumn,
	FileChartPie,
	FileImage,
	FileCog,
	FileType,
	FileDigit,
	ImagePlay,
	FileSearch,
	FileBadge,
	FileTerminal,
	FileLock2,
	FileDiff,
	LucideIcon
} from 'lucide-react';

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

	const FileIcon = () => {
		if (file.name == '.git') return <FolderGit2 size={18} fill="#57CBFC" stroke="#AEE6FE" strokeWidth={1.5} />;
		if (file.is_dir) return <Folder size={18} fill="#57CBFC" strokeWidth={0} />;

		if (file.name == '.DS_Store') return <FileSearch size={18} fill="#222222" stroke="#C8C8C8" strokeWidth={1.5} />;

		const iconMap: Record<string, LucideIcon> = {
			pdf: <FileType size={18} fill="#F3F3F3" stroke="#000" strokeWidth={1.5} />,
			pages: <FileText size={18} fill="#FFB202" stroke="#FFE2B0" strokeWidth={1.5} />,
			doc: <FileText size={18} fill="#0086E4" stroke="#CDE8FF" strokeWidth={1.5} />,
			docx: <FileText size={18} fill="#0086E4" stroke="#CDE8FF" strokeWidth={1.5} />,
			numbers: <FileChartColumn size={18} fill="#00D402" stroke="#E5FFE6" strokeWidth={1.5} />,
			xls: <FileChartColumn size={18} fill="#00D402" stroke="#E5FFE6" strokeWidth={1.5} />,
			xlsx: <FileChartColumn size={18} fill="#00D402" stroke="#E5FFE6" strokeWidth={1.5} />,
			key: <FileChartPie size={18} fill="#FF7802" stroke="#FFDEC1" strokeWidth={1.5} />,
			ppt: <FileChartPie size={18} fill="#FF7802" stroke="#FFDEC1" strokeWidth={1.5} />,
			pptx: <FileChartPie size={18} fill="#FF7802" stroke="#FFDEC1" strokeWidth={1.5} />,
			jpg: <FileImage size={18} fill="#2A65CE" stroke="#C4D5F3" strokeWidth={1.5} />,
			jpeg: <FileImage size={18} fill="#2A65CE" stroke="#C4D5F3" strokeWidth={1.5} />,
			png: <FileImage size={18} fill="#2A65CE" stroke="#C4D5F3" strokeWidth={1.5} />,
			webp: <FileImage size={18} fill="#2A65CE" stroke="#C4D5F3" strokeWidth={1.5} />,
			gif: <ImagePlay size={18} fill="#FE2B99" stroke="#FFB6A1" strokeWidth={1.5} />,
			mp3: <FileAudio size={18} fill="#D55C77" stroke="#FFB6A1" strokeWidth={1.5} />,
			mp4: <FileVideo size={18} fill="#7D00E8" stroke="#B2ADFB" strokeWidth={1.5} />,
			zip: <FolderArchive size={18} fill="#F3F3F3" stroke="#000" strokeWidth={1.5} />,
			rar: <FolderArchive size={18} fill="#F3F3F3" stroke="#000" strokeWidth={1.5} />,
			txt: <FileText size={18} fill="#F3F3F3" stroke="#000" strokeWidth={1.5} />,
			json: <FileJson size={18} fill="#FFA400" stroke="#FFE2B0" strokeWidth={1.5} />,
			js: <FileCode2 size={18} fill="#FFA500" stroke="#FFE2B0" strokeWidth={1.5} />,
			jsx: <FileCode2 size={18} fill="#FFA500" stroke="#FFE2B0" strokeWidth={1.5} />,
			ts: <FileCode2 size={18} fill="#0086E4" stroke="#CDE8FF" strokeWidth={1.5} />,
			tsx: <FileCode2 size={18} fill="#0086E4" stroke="#CDE8FF" strokeWidth={1.5} />,
			rs: <FileCode2 size={18} fill="#A52045" stroke="#EFBCC7" strokeWidth={1.5} />,
			lo: <FileCode2 size={18} fill="#A52045" stroke="#EFBCC7" strokeWidth={1.5} />,
			css: <FilePenLine size={18} fill="#FFAC00" stroke="#FFE2B0" strokeWidth={1.5} />,
			html: <FileCode2 size={18} fill="#00D402" stroke="#E5FFE6" strokeWidth={1.5} />,
			yml: <FileCog size={18} fill="#019C28" stroke="#D6FFE0" strokeWidth={1.5} />,
			yaml: <FileCog size={18} fill="#019C28" stroke="#D6FFE0" strokeWidth={1.5} />,
			toml: <FileCog size={18} fill="#DD484B" stroke="#F8DBDC" strokeWidth={1.5} />,
			bin: <FileDigit size={18} fill="#000" stroke="#F3F3F3" strokeWidth={1.5} />,
			cert: <FileBadge size={18} fill="#AE591E" stroke="#E8CE7D" strokeWidth={1.5} />,
			sh: <FileTerminal size={18} fill="#0E3B0A" stroke="#A2EE9B" strokeWidth={1.5} />,
			zsh: <FileTerminal size={18} fill="#0E3B0A" stroke="#A2EE9B" strokeWidth={1.5} />,
			tish: <FileTerminal size={18} fill="#0E3B0A" stroke="#A2EE9B" strokeWidth={1.5} />,
			lock: <FileLock2 size={18} fill="#000" stroke="#FFF" strokeWidth={1.5} />,
			diff: <FileDiff size={18} fill="#000" stroke="#FFF" strokeWidth={1.5} />,
			patch: <FileDiff size={18} fill="#000" stroke="#FFF" strokeWidth={1.5} />
		};

		return iconMap[file.file_type.toLowerCase()] || <File size={18} fill="#F3F3F3" strokeWidth={0} />;
	};

	return (
		<div
			className={`focus:ring focus:ring-blue-500 cursor-default flex items-center px-5 py-[2.5px] border-b border-stone-300 dark:border-stone-700/50 ${isSelected && 'bg-blue-100 dark:bg-[#0070FF]'}`}
			onContextMenu={(e) => {
				e.currentTarget.focus();
				onContextMenu(e, file);
			}}
			onClick={() => onSelect(file)}
			onDoubleClick={() => onOpen(file)}>
			<div className="mr-2">
				<FileIcon />
			</div>

			{isRenaming ? (
				<div className="flex flex-1 items-center">
					<input
						type="text"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						className="flex-1 p-1 border border-stone-300 rounded"
						autoFocus
						onKeyDown={(e) => {
							if (e.key === 'Enter') onSaveRename();
							if (e.key === 'Escape') onCancelRename();
						}}
					/>
				</div>
			) : (
				<>
					<div className={`flex-1 text-xs dark:text-stone-100 ${file.is_hidden ? 'text-stone-400 dark:text-stone-600 italic' : ''}`}>
						{displayName()}
					</div>
					<div className={`text-stone-500 text-xs mr-4 hidden md:block ${isSelected ? 'dark:text-stone-50' : 'dark:text-stone-500'}`}>
						{file.modified}
					</div>
					<div className={`text-stone-500 text-xs w-20 text-right ${isSelected ? 'dark:text-stone-50' : 'dark:text-stone-500'}`}>
						{file.is_dir ? '--' : formatFileSize(file.size)}
					</div>
				</>
			)}
		</div>
	);
}
