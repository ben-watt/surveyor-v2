/* eslint-disable @next/next/no-img-element */

import React from 'react';
import Image from 'next/image';
import {
  mapAddress,
  SurveySection,
  type BuildingSurveyFormData,
  type ElementSection,
  type Inspection,
} from './BuildingSurveyReportSchema';
import { v4 as uuidv4 } from 'uuid';
import { formatDateWithSuffix } from '@/app/home/utils/dateFormatters';
import { ImageMetadata } from '../../clients/Database';
import {
  LANDSCAPE_WIDTH,
  IMAGE_MAX_HEIGHT,
  SIGNATURE_HEIGHT,
  REPORT_STYLES,
  TABLE_LAYOUTS,
  IMAGE_DIMENSIONS,
} from './constants';
import { DEFAULT_ORG_CONFIG, formatOrgAddress, getOrgContactEmail } from './org-config';
import { mapRagToColor, fallback } from './utils';
import {
  RAG_KEY,
  NOT_INSPECTED,
  TIMEFRAME_GLOSSARY,
  CRACK_DEFINITIONS,
  BUILDING_RISKS,
  GROUNDS_RISKS,
  PEOPLE_RISKS,
  STATUTORY_ITEMS,
  PLANNING_BUILDING_REGULATIONS_CONTENT,
  THERMAL_INSULATION_CONTENT,
  LIMITATION_ITEMS,
  getClientSpecificLimitation,
  IMPORTANT_NOTES,
  CONCLUSION_PARAGRAPHS,
  CONCLUSION_CLOSING,
} from './content';
import { TableBlock, Page, Heading, RiskRow } from '../report-primitives';

// Component definitions moved to app/home/surveys/report-primitives/

export type ImageWithMetadata = {
  uri: string;
  hasMetadata: boolean;
  metadata: ImageMetadata | null;
  isArchived: boolean;
};

export type ReportComponent = Omit<Inspection, 'images'> & {
  images: ImageWithMetadata[];
};

export type ReportElementSection = Omit<ElementSection, 'images' | 'components'> & {
  images: ImageWithMetadata[];
  components: ReportComponent[];
};

export type ReportSurveySection = Omit<SurveySection, 'elementSections'> & {
  elementSections: ReportElementSection[];
};

export type ReportDetails = Omit<
  BuildingSurveyFormData['reportDetails'],
  'frontElevationImagesUri' | 'moneyShot'
> & {
  frontElevationImagesUri: ImageWithMetadata[];
  moneyShot: ImageWithMetadata[];
};

export type BuildingSurveyReportTipTap = Omit<
  BuildingSurveyFormData,
  'reportDetails' | 'sections'
> & {
  reportDetails: ReportDetails;
  sections: ReportSurveySection[];
};

interface PdfProps {
  form: BuildingSurveyReportTipTap;
}

// Note: H2 component moved to report-primitives as Heading component

/// This must be a sync function
/// It needs to be rendered to a basic string rather than a react component
export default function PDF({ form }: PdfProps) {
  const clientName = form.reportDetails.clientName;
  const address = form.reportDetails.address;
  const reportDate = new Date(form.reportDetails.reportDate);
  const inspectionDate = new Date(form.reportDetails.inspectionDate);

  console.debug('Building Survey Report', form);

  return (
    <>
      <Page>
        <TableBlock widths={TABLE_LAYOUTS.coverPageLayout}>
          <div>
            <img
              style={REPORT_STYLES.centeredImage}
              src={undefined}
              data-s3-path={form.reportDetails.moneyShot[0].uri}
              alt="main page image"
              width={IMAGE_DIMENSIONS.moneyShot.width}
              height={IMAGE_DIMENSIONS.moneyShot.height}
            />
          </div>
          <div>
            <p style={{ ...REPORT_STYLES.rightAligned, ...REPORT_STYLES.heading1 }}>
              Level {form.reportDetails.level} Building Survey Report
            </p>
            <p style={REPORT_STYLES.rightAligned}></p>
            <p style={REPORT_STYLES.rightAligned}>Of the premises known as</p>
            <p style={REPORT_STYLES.rightAligned}></p>
            <p style={REPORT_STYLES.rightAligned} className="m-0">
              {address &&
                mapAddress(address, line => (
                  <p style={REPORT_STYLES.rightAligned} key={line}>
                    <strong>{line}</strong>
                  </p>
                ))}
            </p>
            <p style={REPORT_STYLES.rightAligned}></p>
            <p style={REPORT_STYLES.rightAligned}>For and on behalf of</p>
            <p style={REPORT_STYLES.rightAligned}></p>
            <p style={REPORT_STYLES.rightAligned}>
              <strong>{clientName}</strong>
            </p>
            <p style={REPORT_STYLES.rightAligned}></p>
            <p style={REPORT_STYLES.rightAligned}>Prepared by</p>
            {formatOrgAddress(DEFAULT_ORG_CONFIG).map(line => (
              <p key={line} style={REPORT_STYLES.rightAligned}>
                {line}
              </p>
            ))}
            <p style={REPORT_STYLES.rightAligned}></p>
            <p style={REPORT_STYLES.rightAlignedSmall}>{getOrgContactEmail(DEFAULT_ORG_CONFIG)}</p>
            <p style={REPORT_STYLES.rightAlignedSmall}>Date: {reportDate.toDateString()}</p>
            <p style={REPORT_STYLES.rightAlignedSmall}>Ref: {form.reportDetails.reference}</p>
          </div>
        </TableBlock>
      </Page>
      <Page>
        <TableBlock widths={TABLE_LAYOUTS.twoColumnUnequal}>
          <p>Prepared by:</p>
          <p>{form.owner.name}</p>
        </TableBlock>
        <p>
          This document has been prepared and checked in accordance with the {DEFAULT_ORG_CONFIG.name}'s Quality
          Assurance procedures and authorised for release.
        </p>
        <p></p>
        <p>Signed:</p>
        <TableBlock widths={TABLE_LAYOUTS.twoColumnEqual}>
          <img
            style={{ height: SIGNATURE_HEIGHT }}
            src={undefined}
            alt="signature"
            data-s3-path={form.owner.signaturePath[0]}
            width={IMAGE_DIMENSIONS.signature.width}
            height={IMAGE_DIMENSIONS.signature.height}
          />
          <img
            style={{ height: SIGNATURE_HEIGHT }}
            src="data:image/svg+xml,%3Csvg width='600' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='600' height='400' fill='%23cccccc'/%3E%3Ctext x='300' y='200' font-family='Arial' font-size='24' fill='%23666666' text-anchor='middle' dominant-baseline='middle'%3EPlaceholder%3C/text%3E%3C/svg%3E"
            alt="signature"
            width={IMAGE_DIMENSIONS.signature.width}
            height={IMAGE_DIMENSIONS.signature.height}
          />
          <p>{form.owner.name}</p>
          <p>Jordan Clarke BSc (Hons) MRICS</p>
        </TableBlock>
        <p></p>
        <p>For and on behalf of {DEFAULT_ORG_CONFIG.legalName}</p>
        <TableBlock widths={TABLE_LAYOUTS.twoColumnUnequal}>
          <p>
            <strong>Inspection Date:</strong>
          </p>
          <p>{formatDateWithSuffix(inspectionDate)}</p>
          <p>
            <strong>Report Issue Date:</strong>
          </p>
          <p>{formatDateWithSuffix(reportDate)}</p>
          <p>
            <strong>Weather at the time of inspection:</strong>
          </p>
          <p>{form.reportDetails.weather}</p>
          <p>
            <strong>Orientation</strong>
          </p>
          <p>{form.reportDetails.orientation}</p>
          <p>
            <strong>Situation</strong>
          </p>
          <p>{form.reportDetails.situation}</p>
        </TableBlock>
      </Page>
      <Page>
        <div id="toc" data-type="table-of-contents" data-toc-data="[]"></div>
      </Page>
      <Page>
        <h1 style={REPORT_STYLES.heading1}>Definitions</h1>
        <h2 style={REPORT_STYLES.heading1}>Key</h2>
        <TableBlock widths={[94, 6]}>
          {RAG_KEY.map(item => (
            <React.Fragment key={item.color}>
              <ul>
                <li>{item.description}</li>
              </ul>
              <p style={REPORT_STYLES.markerText}>
                <mark style={{ backgroundColor: item.color }}>&nbsp;&nbsp;&nbsp;&nbsp;</mark>
              </p>
            </React.Fragment>
          ))}
          <ul>
            <li>{NOT_INSPECTED.description}</li>
          </ul>
          <p style={REPORT_STYLES.markerText}>
            <strong>{NOT_INSPECTED.label}</strong>
          </p>
        </TableBlock>
        <p></p>
        <TableBlock widths={TABLE_LAYOUTS.twoColumnEqual}>
          <div>
            <h2 style={REPORT_STYLES.heading1}>Glossary of Terms</h2>
            <ul>
              {TIMEFRAME_GLOSSARY.map(({ term, description }) => (
                <li key={term}>
                  {term}: {description}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 style={REPORT_STYLES.heading1}>Crack Definitions (BRE Digest 251)</h2>
            <ul>
              {CRACK_DEFINITIONS.map(({ category, severity, width }) => (
                <li key={category}>
                  Category {category}: {severity} ({width})
                </li>
              ))}
            </ul>
          </div>
        </TableBlock>
      </Page>
      <Page>
        <h2 style={REPORT_STYLES.heading1}>Typical House Diagram</h2>
        <img
          style={REPORT_STYLES.centeredImage}
          src="/typical-house.webp"
          alt="typical house"
          width={IMAGE_DIMENSIONS.typicalHouse.width}
        />
      </Page>
      <Page>
        <h1 style={REPORT_STYLES.heading1}>Description Of the Property</h1>
        <TableBlock widths={TABLE_LAYOUTS.twoColumnNarrowLeft}>
          <h2>
            <strong>Property Type</strong>
          </h2>
          <p>{form.propertyDescription.propertyType}</p>
          <h2>
            <strong>Construction Details</strong>
          </h2>
          <p>{form.propertyDescription.constructionDetails}</p>
          <h2>
            <strong>Year of Construction</strong>
          </h2>
          <p>{form.propertyDescription.yearOfConstruction}</p>
          <h2>
            <strong>Year of Extensions</strong>
          </h2>
          <p>{fallback(form.propertyDescription.yearOfExtensions, 'N/A')}</p>
          <h2>
            <strong>Year of Conversions</strong>
          </h2>
          <p>{fallback(form.propertyDescription.yearOfConversions, 'N/A')}</p>
          <h2>
            <strong>Grounds</strong>
          </h2>
          <p>{form.propertyDescription.grounds}</p>
          <h2>
            <strong>Services</strong>
          </h2>
          <p>{form.propertyDescription.services}</p>
          <h2>
            <strong>Other Services</strong>
          </h2>
          <p>{fallback(form.propertyDescription.otherServices, 'N/A')}</p>

          <h2>
            <strong>Energy Rating</strong>
          </h2>
          <p>{form.propertyDescription.energyRating}</p>
          <h2>
            <strong>Number of Bedrooms</strong>
          </h2>
          <p>{form.propertyDescription.numberOfBedrooms}</p>
          <h2>
            <strong>Number of Bathrooms</strong>
          </h2>
          <p>{form.propertyDescription.numberOfBathrooms}</p>

          <h2>
            <strong>Tenure</strong>
          </h2>
          <p>{form.propertyDescription.tenure}</p>
        </TableBlock>
      </Page>
      <Page>
        <h2 style={REPORT_STYLES.heading1}>Location Plan</h2>
        <p style={REPORT_STYLES.justified}>
          Red line demarcations do not represent the legal boundary of the property and are to
          indicate the approximate areas of the property subject to inspection.
        </p>
        <p></p>
        <img
          style={REPORT_STYLES.locationPlanImage}
          src="data:image/svg+xml,%3Csvg width='600' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='600' height='400' fill='%23cccccc'/%3E%3Ctext x='300' y='200' font-family='Arial' font-size='24' fill='%23666666' text-anchor='middle' dominant-baseline='middle'%3ELocation Plan Placeholder%3C/text%3E%3C/svg%3E"
          alt="placeholder"
          width={IMAGE_DIMENSIONS.placeholder.width}
          height={IMAGE_DIMENSIONS.placeholder.height}
        />
      </Page>
      <Page>
        <TableBlock widths={TABLE_LAYOUTS.twoColumnEqual}>
          {form.reportDetails.frontElevationImagesUri.map((image, i) => (
            <div key={`frontElevation_img_${i}`}>
              <img
                src={undefined}
                data-s3-path={image.uri}
                style={{ maxHeight: IMAGE_MAX_HEIGHT, margin: '0 auto' }}
                alt={`frontElevation_img_${i}`}
              />
              {image.hasMetadata && <p>{image.metadata?.caption}</p>}
            </div>
          ))}
        </TableBlock>
      </Page>
      <Page>
        {form.sections.map((s, i) => (
          <div key={`section.${s.name}.${i}`}>
            <h1 style={REPORT_STYLES.heading1}>{s.name}</h1>
            {s.elementSections.map((cs, j) => (
              <ConditionSection key={`${s.name}.${cs.name}.${j}`} elementSection={cs} form={form} />
            ))}
          </div>
        ))}
      </Page>
      <Page>
        <h1 style={REPORT_STYLES.heading1}>Issues for your Legal Advisor</h1>
        <Heading id="planning-building-regulations" centered>
          Planning & Building Regulations
        </Heading>
        <p style={REPORT_STYLES.justified}>{PLANNING_BUILDING_REGULATIONS_CONTENT}</p>
        <Heading id="statutory" centered>
          Statutory
        </Heading>
        {STATUTORY_ITEMS.map((item, index) => (
          <TableBlock key={item.id} widths={TABLE_LAYOUTS.twoColumnLabelValue}>
            {index === 0 ? <h3>&nbsp;</h3> : <p></p>}
            <ul>
              <li>
                <p style={REPORT_STYLES.justified}>{item.text}</p>
              </li>
            </ul>
          </TableBlock>
        ))}
      </Page>
      <Page>
        <Heading id="thermal-insulation-energy-efficiency" centered>
          Thermal Insulation & Energy Efficiency
        </Heading>
        <TableBlock widths={TABLE_LAYOUTS.twoColumnLabelValue}>
          <h3>&nbsp;</h3>
          <p style={REPORT_STYLES.justified}>{THERMAL_INSULATION_CONTENT[0]}</p>
          <p></p>
          <p style={REPORT_STYLES.justified}>{THERMAL_INSULATION_CONTENT[1]}</p>
        </TableBlock>
      </Page>
      <Page>
        <h1 style={REPORT_STYLES.heading1}>Risks</h1>
        <Heading id="risks-to-the-building" centered>
          Risks to the building
        </Heading>
        {Object.values(BUILDING_RISKS).map(risk => (
          <RiskRow key={risk.id} id={risk.id} risk={risk.title} description={risk.description} />
        ))}
        <p></p>
        <Heading id="risks-to-the-grounds" centered>
          Risks to the grounds
        </Heading>
        {Object.values(GROUNDS_RISKS).map(risk => (
          <RiskRow key={risk.id} id={risk.id} risk={risk.title} description={risk.description} />
        ))}
        <p></p>
        <Heading id="risks-to-the-people" centered>
          Risks to the people
        </Heading>
        {Object.values(PEOPLE_RISKS).map(risk => (
          <RiskRow key={risk.id} id={risk.id} risk={risk.title} description={risk.description} />
        ))}
      </Page>
      <Page>
        <h1 style={REPORT_STYLES.heading1}>Conclusion</h1>
        <TableBlock widths={TABLE_LAYOUTS.twoColumnLabelValue}>
          {CONCLUSION_PARAGRAPHS.map(paragraph => (
            <React.Fragment key={paragraph.id}>
              <h3>&nbsp;</h3>
              <p style={REPORT_STYLES.justified}>{paragraph.text}</p>
            </React.Fragment>
          ))}
        </TableBlock>
        <p>{CONCLUSION_CLOSING}</p>
        <p>
          <strong>{form.owner.name}</strong>
        </p>
        <p>
          <strong>E:{form.owner.email}</strong>
        </p>
      </Page>
      <Page>
        <h1 style={REPORT_STYLES.heading1}>APPENDIX 1 - Limitations</h1>
        {LIMITATION_ITEMS.map(item => (
          <TableBlock key={item.id} widths={TABLE_LAYOUTS.twoColumnLabelValue}>
            <h2 style={REPORT_STYLES.heading3}>&nbsp;</h2>
            <p style={REPORT_STYLES.justified}>{item.text}</p>
          </TableBlock>
        ))}
        <TableBlock widths={TABLE_LAYOUTS.twoColumnLabelValue}>
          <h2 style={REPORT_STYLES.heading3}>&nbsp;</h2>
          <p style={REPORT_STYLES.justified}>{getClientSpecificLimitation(clientName)}</p>
        </TableBlock>
      </Page>
      <Page>
        <p>Important Note:</p>
        {IMPORTANT_NOTES.map((note, index) => (
          <React.Fragment key={index}>
            <p></p>
            <p style={REPORT_STYLES.justified}>{note}</p>
          </React.Fragment>
        ))}
      </Page>
    </>
  );
}

type ConditionSectionProps = {
  key: string;
  elementSection: ReportElementSection;
  form: BuildingSurveyReportTipTap;
};

const ConditionSection = ({ elementSection, form }: ConditionSectionProps) => {
  const es = elementSection;
  const componentImages = es.components.flatMap((x) => x.images);
  const allImages = [...es.images, ...componentImages];

  if (!es.isPartOfSurvey) return <></>;

  let tableRows = [];
  for (let i = 0; i < allImages.length; i = i + 2) {
    tableRows.push(
      <table key={`${elementSection.id}.table.${i}`}>
        <tbody>
          <tr key={`${elementSection.id}.row.${i}`}>
            <td key={`${elementSection.id}.cell.${i}`}>
              <img
                key={`${elementSection.id}.img.${i}`}
                data-s3-path={allImages[i].uri}
                src={undefined}
                alt={elementSection.name + '.image.' + i}
                style={{ maxHeight: '75mm', margin: '0 auto' }}
              />
              {allImages[i].hasMetadata && (
                <p key={`${elementSection.id}.caption.${i}`}>{allImages[i].metadata?.caption}</p>
              )}
            </td>
            <td key={`${elementSection.id}.cell.${i + 1}`}>
              {allImages[i + 1] && (
                <img
                  key={`${elementSection.id}.img.${i + 1}`}
                  data-s3-path={allImages[i + 1].uri}
                  src={undefined}
                  alt={elementSection.name + '.image.' + i}
                  style={{ maxHeight: IMAGE_MAX_HEIGHT, margin: '0 auto' }}
                />
              )}
              {allImages[i + 1]?.hasMetadata && (
                <p key={`${elementSection.id}.caption.${i + 1}`}>
                  {allImages[i + 1].metadata?.caption}
                </p>
              )}
            </td>
          </tr>
        </tbody>
      </table>,
    );
  }

  // Note: mapRagToColor moved to utils.ts

  return (
    <>
      <Page>
        <Heading id={es.id} centered>
          {es.name}
        </Heading>
        <TableBlock widths={[10, 20, 70]}>
          <p></p>
          <p>
            <strong>Description</strong>
          </p>
          <p>{es.description}</p>
        </TableBlock>
        {es.components
          .map(mc => ({ mc: mc, id: uuidv4() }))
          .map(({ mc, id }, i) => (
            <TableBlock widths={TABLE_LAYOUTS.fourColumnReport} key={`${elementSection.id}.${i}`}>
              <p id={id}></p>
              <h3 data-add-toc-here-id={id}>
                <strong>Component</strong>
              </h3>
              <p>{mc.useNameOverride ? mc.nameOverride : mc.name}</p>
              <p style={REPORT_STYLES.ragMarker}>
                {mc.ragStatus === 'N/I' ? (
                  'NI'
                ) : (
                  <mark style={{ backgroundColor: mapRagToColor(mc.ragStatus) }}>
                    &nbsp;&nbsp;&nbsp;&nbsp;
                  </mark>
                )}
              </p>
              <p></p>
              <p>
                <strong>Condition / Defect</strong>
              </p>
              <div>
                {mc.conditions.map(d => {
                  const phraseText =
                    form.reportDetails.level === '2' ? d.phraseLevel2 || d.phrase : d.phrase;
                  return (
                    <React.Fragment key={d.name}>
                      <p style={REPORT_STYLES.justified}>{phraseText}</p>
                      <p style={REPORT_STYLES.tinyText}></p>
                    </React.Fragment>
                  );
                })}
                {mc.additionalDescription && (
                  <p style={REPORT_STYLES.justified}>{mc.additionalDescription}</p>
                )}
              </div>
              <p></p>
              {form.reportDetails.level === '3' && mc.costings.length > 0 && (
                <React.Fragment key={mc.name}>
                  <p></p>
                  <p style={{ fontWeight: '500' }}>Budget Cost</p>
                  <p>
                    {mc.costings.map((c, index) => (
                      <React.Fragment key={c.description + index}>
                        <strong>£{c.cost}</strong> <span>({c.description})</span>
                        {index < mc.costings.length - 1 && ' & '}
                      </React.Fragment>
                    ))}
                  </p>
                  <p></p>
                </React.Fragment>
              )}
            </TableBlock>
          ))}
        <p></p>
        {tableRows}
      </Page>
    </>
  );
};

// Note: RiskRow component moved to report-primitives
