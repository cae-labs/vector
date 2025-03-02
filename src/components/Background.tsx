import { useState, useEffect } from 'react';

interface AlternatingBackgroundRowsProps {
	startIndex: number;
	containerRef: React.RefObject<HTMLDivElement>;
	zoomLevel: number;
}

export const AlternatingBackgroundRows: React.FC<AlternatingBackgroundRowsProps> = ({ startIndex, containerRef, zoomLevel }) => {
	const [rowHeight, setRowHeight] = useState(0);
	const [containerHeight, setContainerHeight] = useState(0);
	const [numVisibleRows, setNumVisibleRows] = useState(0);

	useEffect(() => {
		const calculateDimensions = () => {
			const paddingY = Math.max(2.5, Math.round(2.5 * zoomLevel));
			const baseRowHeight = paddingY * 2 + Math.round(18 * zoomLevel);
			setRowHeight(baseRowHeight);

			if (containerRef.current) {
				const height = containerRef.current.clientHeight;
				setContainerHeight(height);

				const visibleRows = Math.floor(height / baseRowHeight) + 1;
				setNumVisibleRows(visibleRows);
			}
		};

		calculateDimensions();

		const handleResize = () => {
			calculateDimensions();
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, [containerRef, zoomLevel]);

	if (startIndex >= numVisibleRows) return null;

	const neededRows = Math.max(0, numVisibleRows - startIndex - 1);
	const placeholderRows = [];

	for (let i = 0; i < neededRows; i++) {
		const isAlternate = (startIndex + i) % 2 === 1;

		placeholderRows.push(
			<div
				key={`placeholder-${i}`}
				className={`w-full border-b border-stone-300 dark:border-stone-700/50 ${isAlternate ? 'bg-stone-50 dark:bg-stone-800/50' : ''}`}
				style={{
					height: `${rowHeight}px`,
					pointerEvents: 'none'
				}}
			/>
		);
	}

	return <>{placeholderRows}</>;
};
