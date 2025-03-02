export const KeybindBadge = ({ children }) => {
	return (
		<span className="ml-3 inline-block bg-stone-100 dark:bg-zinc-800 text-stone-800 dark:text-stone-300 border border-stone-300 dark:border-zinc-700 rounded px-1.5 text-[11px] font-mono">
			{children}
		</span>
	);
};
