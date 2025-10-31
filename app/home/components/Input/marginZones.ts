export type MarginZone =
  | 'topLeftCorner'
  | 'topLeft'
  | 'topCenter'
  | 'topRight'
  | 'topRightCorner'
  | 'leftTop'
  | 'leftMiddle'
  | 'leftBottom'
  | 'rightTop'
  | 'rightMiddle'
  | 'rightBottom'
  | 'bottomLeftCorner'
  | 'bottomLeft'
  | 'bottomCenter'
  | 'bottomRight'
  | 'bottomRightCorner';

export type ZoneMetadata = {
  label: string;
  description: string;
  runningName: string;
  dataRole: string;
  defaultHtml: string;
  allowHandlebars: boolean;
  showTemplateButton?: boolean;
};

export const DEFAULT_HEADER_HTML =
  '<div class="header-container"><table class="header-table" role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;"><tbody><tr><td class="header-table__media"><div class="headerPrimary" data-running-role="top-center"><img class="headerImage" src="/cwbc_header.jpg" alt="Header image" style="max-width:100%;height:auto;display:block;" /></div></td><td class="header-table__details"><div class="headerAddress" data-running-role="top-right"><p class="text-xs text-gray-600">Unknown address</p><p class="text-xs text-gray-600">Reference</p><p class="text-xs text-gray-600">Date</p></div></td></tr></tbody></table></div>';

export const DEFAULT_FOOTER_HTML =
  '<div class="footer-container"><div class="footerPrimary" data-running-role="bottom-center"><img class="footerImage" src="/rics-purple-logo.jpg" alt="Footer image" style="max-width:200px;height:auto;" /></div></div>';

export const MARGIN_ZONE_METADATA: Record<MarginZone, ZoneMetadata> = {
  topLeftCorner: {
    label: 'Top Left Corner',
    description: 'Sits at the intersection of top and left margins. Ideal for corner flourishes.',
    runningName: 'pageMarginTopLeftCorner',
    dataRole: 'top-left-corner',
    defaultHtml: '',
    allowHandlebars: true,
  },
  topLeft: {
    label: 'Top Left',
    description: 'Runs along the top margin above the left column. Great for secondary logos.',
    runningName: 'pageMarginTopLeft',
    dataRole: 'top-left',
    defaultHtml: '',
    allowHandlebars: true,
  },
  topCenter: {
    label: 'Top Center',
    description: 'Primary header content rendered in the center of the top margin.',
    runningName: 'pageMarginTopCenter',
    dataRole: 'top-center',
    defaultHtml: '',
    allowHandlebars: true,
    showTemplateButton: true,
  },
  topRight: {
    label: 'Top Right',
    description: 'Top margin content adjacent to the right column. Perfect for address blocks.',
    runningName: 'pageMarginTopRight',
    dataRole: 'top-right',
    defaultHtml: '',
    allowHandlebars: true,
  },
  topRightCorner: {
    label: 'Top Right Corner',
    description: 'Corner of the top and right margins for badges or decorative seals.',
    runningName: 'pageMarginTopRightCorner',
    dataRole: 'top-right-corner',
    defaultHtml: '',
    allowHandlebars: true,
  },
  leftTop: {
    label: 'Left Top',
    description: 'Top segment of the left margin. Useful for chapter titles or vertical notes.',
    runningName: 'pageMarginLeftTop',
    dataRole: 'left-top',
    defaultHtml: '',
    allowHandlebars: true,
  },
  leftMiddle: {
    label: 'Left Middle',
    description: 'Middle segment of the left margin for navigation or sidenotes.',
    runningName: 'pageMarginLeftMiddle',
    dataRole: 'left-middle',
    defaultHtml: '',
    allowHandlebars: true,
  },
  leftBottom: {
    label: 'Left Bottom',
    description: 'Bottom segment of the left margin for supplemental information.',
    runningName: 'pageMarginLeftBottom',
    dataRole: 'left-bottom',
    defaultHtml: '',
    allowHandlebars: true,
  },
  rightTop: {
    label: 'Right Top',
    description: 'Top segment of the right margin for metadata or contact details.',
    runningName: 'pageMarginRightTop',
    dataRole: 'right-top',
    defaultHtml: '',
    allowHandlebars: true,
  },
  rightMiddle: {
    label: 'Right Middle',
    description: 'Middle segment of the right margin for annotations or key facts.',
    runningName: 'pageMarginRightMiddle',
    dataRole: 'right-middle',
    defaultHtml: '',
    allowHandlebars: true,
  },
  rightBottom: {
    label: 'Right Bottom',
    description: 'Bottom segment of the right margin for supplementary notes.',
    runningName: 'pageMarginRightBottom',
    dataRole: 'right-bottom',
    defaultHtml: '',
    allowHandlebars: true,
  },
  bottomLeftCorner: {
    label: 'Bottom Left Corner',
    description: 'Intersection of bottom and left margins. Good for seals or signatures.',
    runningName: 'pageMarginBottomLeftCorner',
    dataRole: 'bottom-left-corner',
    defaultHtml: '',
    allowHandlebars: true,
  },
  bottomLeft: {
    label: 'Bottom Left',
    description: 'Bottom margin segment on the left. Useful for document names or links.',
    runningName: 'pageMarginBottomLeft',
    dataRole: 'bottom-left',
    defaultHtml: '',
    allowHandlebars: true,
  },
  bottomCenter: {
    label: 'Bottom Center',
    description: 'Primary footer slot. Ideal for legal disclaimers or logos.',
    runningName: 'pageMarginBottomCenter',
    dataRole: 'bottom-center',
    defaultHtml: '',
    allowHandlebars: true,
    showTemplateButton: true,
  },
  bottomRight: {
    label: 'Bottom Right',
    description: 'Bottom margin segment on the right. Combine with counters or page numbers.',
    runningName: 'pageMarginBottomRight',
    dataRole: 'bottom-right',
    defaultHtml: '',
    allowHandlebars: true,
  },
  bottomRightCorner: {
    label: 'Bottom Right Corner',
    description: 'Corner of the bottom and right margins for seals or icons.',
    runningName: 'pageMarginBottomRightCorner',
    dataRole: 'bottom-right-corner',
    defaultHtml: '',
    allowHandlebars: true,
  },
};

const ALL_MARGIN_ZONES = Object.keys(MARGIN_ZONE_METADATA) as MarginZone[];

const canUseDom = () =>
  typeof window !== 'undefined' && typeof window.document !== 'undefined';

const hasContent = (value: string | undefined) =>
  typeof value === 'string' && value.trim().length > 0;

export const distributeRunningHtml = (
  input: Partial<Record<MarginZone, string>>,
): Partial<Record<MarginZone, string>> => {
  if (!canUseDom()) {
    return { ...input };
  }

  const result: Partial<Record<MarginZone, string>> = { ...input };

  for (const zone of ALL_MARGIN_ZONES) {
    const html = result[zone];
    if (!html) continue;

    const template = window.document.createElement('template');
    template.innerHTML = html;

    let mutated = false;

    for (const otherZone of ALL_MARGIN_ZONES) {
      if (otherZone === zone) continue;
      const { runningName, dataRole } = MARGIN_ZONE_METADATA[otherZone];
      const selector = `#${runningName}, [data-running-role="${dataRole}"]`;
      const matches = template.content.querySelectorAll(selector);
      if (!matches.length) continue;

      matches.forEach((node) => {
        if (!(node instanceof window.HTMLElement)) return;
        if (!hasContent(result[otherZone])) {
          result[otherZone] = node.outerHTML;
        }
        node.remove();
        mutated = true;
      });
    }

    if (mutated) {
      result[zone] = template.innerHTML;
    }
  }

  return result;
};
