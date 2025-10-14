'use client';

import React from 'react';
import { Wand2 } from 'lucide-react';
import InlineTemplateComposer, {
  type InlineTemplateComposerAction,
  type InlineTemplateComposerHandle,
} from '@/components/conditions/InlineTemplateComposer';

const SAMPLE = `The electrical installation appears aged, with {{select+:electrical_findings|a dated consumer unit|older wiring|loose or surface-mounted cabling|dated fittings}} noted. No specialist electrical testing was undertaken as part of this inspection, so the safety and compliance of the installation cannot be confirmed. We recommend obtaining commissioning and testing certificates from the vendor to confirm that the installation was carried out by a suitably qualified electrician (NICEIC or equivalent). If documentation is unavailable, an Electrical Installation Condition Report (EICR) should be commissioned.

Based on the observed condition, significant upgrading — potentially including a full rewire — may be required to ensure safety and compliance with current standards. Advice and costings should be obtained from a suitably qualified electrician before exchange of contracts.`;

export default function InlineSelectDevPage() {
  const [template, setTemplate] = React.useState<string>(SAMPLE);
  const composerRef = React.useRef<InlineTemplateComposerHandle>(null);

  const tokenAction = React.useMemo<InlineTemplateComposerAction>(
    () => ({
      label: 'Insert sample token',
      icon: <Wand2 className="h-5 w-5" />,
      onSelect: () => composerRef.current?.insertSampleToken(),
    }),
    [],
  );

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">InlineSelect Dev Tester</h1>

      <InlineTemplateComposer
        ref={composerRef}
        value={template}
        onChange={setTemplate}
        tokenModeAction={tokenAction}
      />

      <div className="text-sm text-gray-600">
        Tips:
        <ul className="ml-6 list-disc">
          <li>Type or paste tokens like {`{{select+:key|opt1|opt2}}`} to auto-convert.</li>
          <li>Legacy bracket blocks like [a / b] also auto-convert.</li>
          <li>Use the dropdown or “Add custom…” to set a value inline.</li>
        </ul>
      </div>
    </div>
  );
}
