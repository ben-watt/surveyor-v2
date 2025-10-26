import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

const DEFAULT_DPI = 96;

export type PageSizeId = 'letter' | 'a4';

export type Orientation = 'portrait' | 'landscape';

export type Margins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type PageLayoutState = {
  pageSize: PageSizeId;
  orientation: Orientation;
  margins: Margins;
  zoom: number;
  showBreaks: boolean;
};

export type PageLayoutSnapshot = PageLayoutState & {
  pageDimensionsPx: { width: number; height: number };
  pageDimensionsIn: { width: number; height: number };
};

type PageLayoutContextValue = PageLayoutSnapshot & {
  setPageSize: (pageSize: PageSizeId) => void;
  setOrientation: (orientation: Orientation) => void;
  setMargins: (margins: Margins) => void;
  setZoom: (zoom: number) => void;
  setShowBreaks: (show: boolean) => void;
};

type PageSizeDefinition = {
  label: string;
  widthIn: number;
  heightIn: number;
};

const PAGE_SIZES: Record<PageSizeId, PageSizeDefinition> = {
  letter: {
    label: 'Letter (8.5 x 11 in)',
    widthIn: 8.5,
    heightIn: 11,
  },
  a4: {
    label: 'A4 (210 x 297 mm)',
    widthIn: 8.27,
    heightIn: 11.69,
  },
};

const DEFAULT_LAYOUT: PageLayoutState = {
  pageSize: 'a4',
  orientation: 'landscape',
  margins: {
    top: 1,
    right: 1,
    bottom: 1,
    left: 1,
  },
  zoom: 1,
  showBreaks: false,
};

const PageLayoutContext = createContext<PageLayoutContextValue | undefined>(undefined);

const computeDimensions = (pageSize: PageSizeId, orientation: Orientation) => {
  const definition = PAGE_SIZES[pageSize];
  const widthIn = orientation === 'portrait' ? definition.widthIn : definition.heightIn;
  const heightIn = orientation === 'portrait' ? definition.heightIn : definition.widthIn;

  return {
    widthPx: Math.round(widthIn * DEFAULT_DPI),
    heightPx: Math.round(heightIn * DEFAULT_DPI),
    widthIn,
    heightIn,
  };
};

type PageLayoutProviderProps = {
  children: ReactNode;
  initialState?: Partial<PageLayoutState>;
};

export const PageLayoutProvider: React.FC<PageLayoutProviderProps> = ({
  children,
  initialState,
}) => {
  const [layout, setLayout] = useState<PageLayoutState>({
    ...DEFAULT_LAYOUT,
    ...initialState,
  });

  const setPageSize = useCallback((pageSize: PageSizeId) => {
    setLayout((prev) => ({ ...prev, pageSize }));
  }, []);

  const setOrientation = useCallback((orientation: Orientation) => {
    setLayout((prev) => ({ ...prev, orientation }));
  }, []);

  const setMargins = useCallback((margins: Margins) => {
    setLayout((prev) => ({ ...prev, margins }));
  }, []);

  const setZoom = useCallback((zoom: number) => {
    setLayout((prev) => ({ ...prev, zoom }));
  }, []);

  const setShowBreaks = useCallback((showBreaks: boolean) => {
    setLayout((prev) => ({ ...prev, showBreaks }));
  }, []);

  const value = useMemo<PageLayoutContextValue>(() => {
    const { widthPx, heightPx, widthIn, heightIn } = computeDimensions(
      layout.pageSize,
      layout.orientation,
    );

    return {
      ...layout,
      pageDimensionsPx: { width: widthPx, height: heightPx },
      pageDimensionsIn: { width: widthIn, height: heightIn },
      setPageSize,
      setOrientation,
      setMargins,
      setZoom,
      setShowBreaks,
    };
  }, [layout, setMargins, setOrientation, setPageSize, setShowBreaks, setZoom]);

  return (
    <PageLayoutContext.Provider value={value}>{children}</PageLayoutContext.Provider>
  );
};

export const usePageLayout = () => {
  const context = useContext(PageLayoutContext);
  if (!context) {
    throw new Error('usePageLayout must be used within a PageLayoutProvider');
  }
  return context;
};

export const usePageLayoutDimensions = () => {
  const { pageDimensionsPx } = usePageLayout();
  return pageDimensionsPx;
};

export const INCH_TO_PX = DEFAULT_DPI;
export const PAGE_SIZE_OPTIONS = PAGE_SIZES;
export const DEFAULT_PAGE_LAYOUT = DEFAULT_LAYOUT;
