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
	AppWindowMac,
	FileLock2,
	FileDiff,
	LucideIcon,
	ChevronRight,
	ChevronDown
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
	zoomLevel?: number;
	iconSize?: number;
	isExpanded?: boolean;
	onToggleExpand?: (file: FileEntry) => void;
	depth?: number;
	isExpandable?: boolean;
	isAlternate?: boolean;
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
	onCancelRename,
	zoomLevel = 1.0,
	iconSize = 18,
	isExpanded = false,
	onToggleExpand,
	depth = 0,
	isExpandable = true,
	isAlternate = false
}: FileItemProps) {
	const [isMacOS, setIsMacOS] = useState(false);
	const [relativeTime, setRelativeTime] = useState('');
	const [isLaunching, setIsLaunching] = useState(false);
	const [isHovering, setIsHovering] = useState(false);

	const marginRight = zoomLevel / 2;
	const scaledIconSize = Math.round(iconSize * zoomLevel);
	const paddingY = Math.max(2.5, Math.round(2.5 * zoomLevel));
	const fontSize = `${Math.max(0.75, 0.75 * zoomLevel)}rem`;
	const indentSize = 16;

	useEffect(() => {
		setIsMacOS(platform() === 'macos');
	}, []);

	useEffect(() => {
		const updateRelativeTime = () => {
			setRelativeTime(formatTimeString(new Date(file.modified)));
		};

		updateRelativeTime();

		const intervalId = setInterval(updateRelativeTime, 60000);

		return () => clearInterval(intervalId);
	}, [file.modified]);

	const formatTimeString = (date: Date): string => {
		const now = new Date();
		const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();

		const hours = date.getHours();
		const minutes = date.getMinutes();
		const ampm = hours >= 12 ? 'PM' : 'AM';
		const formattedHours = hours % 12 || 12;
		const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
		const timeString = `${formattedHours}:${formattedMinutes} ${ampm}`;

		if (isToday) {
			return `Today at ${timeString}`;
		} else {
			const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
			const month = months[date.getMonth()];
			const day = date.getDate();
			const year = date.getFullYear();

			return `${month} ${day}, ${year} at ${timeString}`;
		}
	};

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

	const handleAppLaunch = (file: FileEntry) => {
		if (file.name.endsWith('.app')) {
			setIsLaunching(true);

			setTimeout(() => {
				setIsLaunching(false);
			}, 800);
		}

		onOpen(file);
	};

	const handleExpandToggle = (e: MouseEvent) => {
		e.stopPropagation();
		if (onToggleExpand && file.is_dir && isExpandable) {
			onToggleExpand(file);
		}
	};

	const FileIcon = () => {
		if (file.name == '.git') return <FolderGit2 size={scaledIconSize} fill="#57CBFC" stroke="#AEE6FE" strokeWidth={1.5} />;

		if (file.name.endsWith('.app')) {
			return (
				<div className="relative">
					<AppWindowMac size={scaledIconSize} fill="#2E2C2A" stroke="#FFF" strokeWidth={1.5} />

					{isLaunching && (
						<div
							className="absolute top-0 left-0"
							style={{
								animation: 'launch-app-ping 500ms cubic-bezier(0, 0, 0.2, 1)',
								transformOrigin: 'center'
							}}>
							<AppWindowMac size={scaledIconSize} fill="#2E2C2A" stroke="#FFF" strokeWidth={1.5} />
						</div>
					)}
				</div>
			);
		}

		if (file.is_dir) return <Folder size={scaledIconSize} fill="#57CBFC" strokeWidth={0} />;

		if (file.name == '.DS_Store') return <FileSearch size={scaledIconSize} fill="#222222" stroke="#C8C8C8" strokeWidth={1.5} />;

		const iconMap: Record<string, LucideIcon> = {
			pdf: <FileType size={scaledIconSize} fill="#F3F3F3" stroke="#000" strokeWidth={1.5} />,
			pages: <FileText size={scaledIconSize} fill="#FFB202" stroke="#FFE2B0" strokeWidth={1.5} />,
			doc: <FileText size={scaledIconSize} fill="#0086E4" stroke="#CDE8FF" strokeWidth={1.5} />,
			docx: <FileText size={scaledIconSize} fill="#0086E4" stroke="#CDE8FF" strokeWidth={1.5} />,
			numbers: <FileChartColumn size={scaledIconSize} fill="#00D402" stroke="#E5FFE6" strokeWidth={1.5} />,
			csv: <FileChartColumn size={scaledIconSize} fill="#00D402" stroke="#E5FFE6" strokeWidth={1.5} />,
			xls: <FileChartColumn size={scaledIconSize} fill="#00D402" stroke="#E5FFE6" strokeWidth={1.5} />,
			xlsx: <FileChartColumn size={scaledIconSize} fill="#00D402" stroke="#E5FFE6" strokeWidth={1.5} />,
			key: <FileChartPie size={scaledIconSize} fill="#FF7802" stroke="#FFDEC1" strokeWidth={1.5} />,
			ppt: <FileChartPie size={scaledIconSize} fill="#FF7802" stroke="#FFDEC1" strokeWidth={1.5} />,
			pptx: <FileChartPie size={scaledIconSize} fill="#FF7802" stroke="#FFDEC1" strokeWidth={1.5} />,
			icns: <FileImage size={scaledIconSize} fill="#FF7802" stroke="#FFDEC1" strokeWidth={1.5} />,
			ico: <FileImage size={scaledIconSize} fill="#FF7802" stroke="#FFDEC1" strokeWidth={1.5} />,
			jpg: <FileImage size={scaledIconSize} fill="#2A65CE" stroke="#C4D5F3" strokeWidth={1.5} />,
			jpeg: <FileImage size={scaledIconSize} fill="#2A65CE" stroke="#C4D5F3" strokeWidth={1.5} />,
			png: <FileImage size={scaledIconSize} fill="#2A65CE" stroke="#C4D5F3" strokeWidth={1.5} />,
			svg: <FileImage size={scaledIconSize} fill="#2A65CE" stroke="#C4D5F3" strokeWidth={1.5} />,
			webp: <FileImage size={scaledIconSize} fill="#2A65CE" stroke="#C4D5F3" strokeWidth={1.5} />,
			pxd: <FileImage size={scaledIconSize} fill="#D55C77" stroke="#FFB6A1" strokeWidth={1.5} />,
			psd: <FileImage size={scaledIconSize} fill="#D55C77" stroke="#FFB6A1" strokeWidth={1.5} />,
			gif: <ImagePlay size={scaledIconSize} fill="#FE2B99" stroke="#FFB6A1" strokeWidth={1.5} />,
			mp3: <FileAudio size={scaledIconSize} fill="#D55C77" stroke="#FFB6A1" strokeWidth={1.5} />,
			m4a: <FileAudio size={scaledIconSize} fill="#D55C77" stroke="#FFB6A1" strokeWidth={1.5} />,
			flac: <FileAudio size={scaledIconSize} fill="#D55C77" stroke="#FFB6A1" strokeWidth={1.5} />,
			wav: <FileAudio size={scaledIconSize} fill="#D55C77" stroke="#FFB6A1" strokeWidth={1.5} />,
			mp4: <FileVideo size={scaledIconSize} fill="#7D00E8" stroke="#B2ADFB" strokeWidth={1.5} />,
			mov: <FileVideo size={scaledIconSize} fill="#7D00E8" stroke="#B2ADFB" strokeWidth={1.5} />,
			zip: <FolderArchive size={scaledIconSize} fill="#F3F3F3" stroke="#000" strokeWidth={1.5} />,
			tar: <FolderArchive size={scaledIconSize} fill="#F3F3F3" stroke="#000" strokeWidth={1.5} />,
			gz: <FolderArchive size={scaledIconSize} fill="#F3F3F3" stroke="#000" strokeWidth={1.5} />,
			rar: <FolderArchive size={scaledIconSize} fill="#F3F3F3" stroke="#000" strokeWidth={1.5} />,
			txt: <FileText size={scaledIconSize} fill="#F3F3F3" stroke="#000" strokeWidth={1.5} />,
			json: <FileJson size={scaledIconSize} fill="#FFA400" stroke="#FFE2B0" strokeWidth={1.5} />,
			js: <FileCode2 size={scaledIconSize} fill="#FFA500" stroke="#FFE2B0" strokeWidth={1.5} />,
			db: <FileCode2 size={scaledIconSize} fill="#FFA500" stroke="#FFE2B0" strokeWidth={1.5} />,
			jsx: <FileCode2 size={scaledIconSize} fill="#FFA500" stroke="#FFE2B0" strokeWidth={1.5} />,
			ts: <FileCode2 size={scaledIconSize} fill="#0086E4" stroke="#CDE8FF" strokeWidth={1.5} />,
			tsx: <FileCode2 size={scaledIconSize} fill="#0086E4" stroke="#CDE8FF" strokeWidth={1.5} />,
			rs: <FileCode2 size={scaledIconSize} fill="#A52045" stroke="#EFBCC7" strokeWidth={1.5} />,
			lo: <FileCode2 size={scaledIconSize} fill="#A52045" stroke="#EFBCC7" strokeWidth={1.5} />,
			lua: <FileCode2 size={scaledIconSize} fill="#739CFC" stroke="#C9D8FE" strokeWidth={1.5} />,
			css: <FilePenLine size={scaledIconSize} fill="#FFAC00" stroke="#FFE2B0" strokeWidth={1.5} />,
			html: <FileCode2 size={scaledIconSize} fill="#00D402" stroke="#E5FFE6" strokeWidth={1.5} />,
			yml: <FileCog size={scaledIconSize} fill="#019C28" stroke="#D6FFE0" strokeWidth={1.5} />,
			yaml: <FileCog size={scaledIconSize} fill="#019C28" stroke="#D6FFE0" strokeWidth={1.5} />,
			toml: <FileCog size={scaledIconSize} fill="#DD484B" stroke="#F8DBDC" strokeWidth={1.5} />,
			bin: <FileDigit size={scaledIconSize} fill="#000" stroke="#F3F3F3" strokeWidth={1.5} />,
			dmg: <FileDigit size={scaledIconSize} fill="#000" stroke="#F3F3F3" strokeWidth={1.5} />,
			cert: <FileBadge size={scaledIconSize} fill="#AE591E" stroke="#E8CE7D" strokeWidth={1.5} />,
			sh: <FileTerminal size={scaledIconSize} fill="#0E3B0A" stroke="#A2EE9B" strokeWidth={1.5} />,
			zsh: <FileTerminal size={scaledIconSize} fill="#0E3B0A" stroke="#A2EE9B" strokeWidth={1.5} />,
			tish: <FileTerminal size={scaledIconSize} fill="#0E3B0A" stroke="#A2EE9B" strokeWidth={1.5} />,
			lock: <FileLock2 size={scaledIconSize} fill="#000" stroke="#FFF" strokeWidth={1.5} />,
			diff: <FileDiff size={scaledIconSize} fill="#000" stroke="#FFF" strokeWidth={1.5} />,
			patch: <FileDiff size={scaledIconSize} fill="#000" stroke="#FFF" strokeWidth={1.5} />
		};

		return iconMap[file.file_type.toLowerCase()] || <File size={scaledIconSize} fill="#F3F3F3" strokeWidth={0} />;
	};

	return (
		<div
			className={`cursor-default flex items-center border-b border-stone-300 dark:border-stone-700/50 ${
				isSelected ? 'bg-blue-100 dark:bg-[#0070FF]' : isAlternate ? 'bg-stone-50 dark:bg-stone-800/50' : ''
			}`}
			onContextMenu={(e) => onContextMenu(e, file)}
			onClick={() => onSelect(file)}
			onMouseEnter={() => setIsHovering(true)}
			onMouseLeave={() => setIsHovering(false)}
			onDoubleClick={() => {
				if (!isRenaming) handleAppLaunch(file);
			}}
			style={{
				padding: `${paddingY}px 1.25rem`,
				paddingLeft: `${depth * indentSize + 8}px`
			}}>
			{file.is_dir && isExpandable && (
				<div
					className={`flex items-center justify-center w-4 h-4 mr-1 ${isMacOS || isHovering ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150 ease-in-out`}
					onClick={handleExpandToggle}>
					{isExpanded ? (
						<ChevronDown size={14} className={`text-stone-500 ${isSelected ? 'text-white' : 'dark:text-stone-400'}`} />
					) : (
						<ChevronRight size={14} className={`text-stone-500 ${isSelected ? 'text-white' : 'dark:text-stone-400'}`} />
					)}
				</div>
			)}
			{(!file.is_dir || !isExpandable) && <div className="w-4 mr-1"></div>}

			<div style={{ marginRight: `${marginRight}rem` }}>
				<FileIcon />
			</div>

			{isRenaming ? (
				<div className="flex flex-1 items-center">
					<input
						type="text"
						value={newName}
						onChange={(e) => setNewName(e.target.value)}
						className="px-1 bg-blue-100/80 border-0 rounded outline-none dark:bg-blue-900/40 dark:text-white ring-blue-400 ring-3 ring-inset"
						style={{
							fontSize,
							minWidth: `${displayName().length}ch`,
							width: `${Math.max(newName.length * 0.7, displayName().length * 0.7)}ch`,
							maxWidth: 'calc(100% - 120px)'
						}}
						autoFocus
						onBlur={onSaveRename}
						onClick={(e) => e.stopPropagation()}
						onKeyDown={(e) => {
							if (e.key === 'Enter') onSaveRename();
							if (e.key === 'Escape') onCancelRename();
						}}
					/>
				</div>
			) : (
				<>
					<div
						style={{ fontSize }}
						className={`flex-1 truncate text-xs dark:text-stone-100 ${file.is_hidden ? 'text-stone-400 dark:text-stone-600 italic' : ''}`}>
						{displayName()}
					</div>
					<div
						style={{ fontSize }}
						className={`text-stone-500 text-xs mr-4 hidden md:block ${isSelected ? 'dark:text-stone-50' : 'dark:text-stone-500'}`}>
						{relativeTime}
					</div>
					<div style={{ fontSize }} className={`text-stone-500 text-xs w-20 text-right ${isSelected ? 'dark:text-stone-50' : 'dark:text-stone-500'}`}>
						{file.is_dir ? '--' : formatFileSize(file.size)}
					</div>
				</>
			)}
		</div>
	);
}
