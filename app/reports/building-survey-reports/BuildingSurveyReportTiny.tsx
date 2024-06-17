import React, { useContext, useEffect } from "react";
import type {
  BuildingSurveyFormData,
  ElementSection,
} from "./BuildingSurveyReportData";
import {
  DefaultTocProvider,
  TocContext,
  TocProvider,
} from "../../components/Toc";

import { StorageImage } from '@aws-amplify/ui-react-storage';

const TableBlock = ({
  children,
  widths,
}: {
  children: React.ReactNode;
  widths: number[];
}) => {
  if (widths.reduce((a, b) => a + b, 0) !== 100)
    throw new Error("Widths must add up to 100");

  if (children === null || children === undefined)
    throw new Error("Children must not be null or undefined");

  const childrenArray = React.Children.toArray(children);
  if (childrenArray.length % widths.length !== 0)
    throw new Error("Number of children must be a multiple of widths");

  let tableRows = [];
  for (let i = 0; i < childrenArray.length; i = i + widths.length) {
    let row = [];
    for (let j = 0; j < widths.length; j++) {
      row.push(
        <td key={j} className={"w-" + widths[j] + "-perc " + "text-top"}>
          {childrenArray[i + j]}
        </td>
      );
    }
    tableRows.push(<tr key={i}>{row}</tr>);
  }

  return (
    <table className="w-100-perc">
      <tbody>{tableRows}</tbody>
    </table>
  );
};

interface ContentBlockProps extends React.PropsWithChildren<any> {
  tocProvider: TocProvider;
}

const ContentBlock = ({ children, tocProvider }: ContentBlockProps) => {
  let firstElement = null;
  if (Array.isArray(children)) {
    firstElement = children[0];
  } else {
    firstElement = children;
  }

  let dynamicElement = React.createElement(
    firstElement.type,
    {},
    tocProvider(firstElement.type)
  );

  return (
    <table className="w-100-perc">
      <tbody>
        <tr>
          <td className="w-10-perc text-top text-right">{dynamicElement}</td>
          <td className="w-90-perc">{children}</td>
        </tr>
      </tbody>
    </table>
  );
};

interface PProps extends React.PropsWithChildren<any> {}

const P = (props: PProps) => {
  const tocProvider = useContext(TocContext);

  return (
    <ContentBlock tocProvider={tocProvider}>
      <p>{props.children}</p>
    </ContentBlock>
  );
};

const H1 = (props: PProps) => {
  const tocProvider = useContext(TocContext);
  return (
    <ContentBlock tocProvider={tocProvider}>
      <h1>{props.children}</h1>
    </ContentBlock>
  );
};

const H2 = (props: PProps) => {
  const tocProvider = useContext(TocContext);
  return (
    <ContentBlock tocProvider={tocProvider}>
      <h2>{props.children}</h2>
    </ContentBlock>
  );
};

const getImagesFromFileList = (fileList: string[]): string[] => {
  return fileList;
};

const Page = (props: React.PropsWithChildren<any>) => (
  <>
    <section className={"mt-8 mb-8 " + props.className}>
      {props.children}
    </section>
    <p>---------</p>
  </>
);

interface PdfProps {
  form: BuildingSurveyFormData;
}

/// This must be a sync function
/// It needs to be rendered to a basic string rather than a react component
export default function PDF({ form }: PdfProps) {
  const clientName = form.clientName;
  const address = form.address;
  const reportDate = new Date(form.reportDate);

  return (
    <TocContext.Provider value={DefaultTocProvider()}>
      <img width={300} src="/cwbc-logo.webp" alt="cwbc logo" />
      <Page className="text-right">
        <h1>Building Survey Report</h1>
        <p></p>
        <div>
          <p>Of the premises known as</p>
          {address.split(",").map((word, i) => (
            <p key={i} className="m-0">
              <strong>{word}</strong>
            </p>
          ))}
        </div>
        <p></p>
        <div>
          <p>For and on behalf of</p>
          <p>
            <strong>{clientName}</strong>
          </p>
        </div>
        <p></p>
        <div>
          <p>Prepared By</p>
          <p>Clarke & Watt Building Consultancy Ltd</p>
          <div>
            <p className="m-0">Northern Assurance Building</p>
            <p className="m-0">9-21 Princess Street</p>
            <p className="m-0">Manchester</p>
            <p className="m-0">M2 4DN</p>
          </div>
        </div>
        <p></p>
        <div className="text-sm">
          <p className="m-0">Email: admin@cwbc.co.uk</p>
          <p className="m-0">Date: {reportDate.toDateString()}</p>
          <p className="m-0">Ref: 23.120</p>
        </div>
      </Page>
      <Page className="text-center">
        <img src="/cwbc-logo.webp" alt="cwbc logo" />
        <p>
          <strong>{address}</strong>
        </p>
      </Page>
      <Page>
        <TableBlock widths={[40, 60]}>
          <p>Prepared by:</p>
          <div>
            <p>Samuel Watt BSc (Hons)</p>
            <p>Clarke & Watt Building Consultancy Ltd</p>
            <p>Unit 4</p>
            <p>Booth Road</p>
            <p>33 Greek Street</p>
            <p>Stockport</p>
            <p>SK3 8AX</p>
          </div>
          <p>Telephone:</p>
          <p>0116 403 0221</p>
          <p>Email:</p>
          <p>sam.watt@cwbc.co.uk</p>
          <p>Inspection Date:</p>
          <p>{reportDate.toDateString()}</p>
          <p>Report Issue Date:</p>
          <p>{reportDate.toDateString()}</p>
          <p>Weather at the time of inspection:</p>
          <p>Unknown</p>
          <p>Orientation</p>
          <p>Unknown</p>
          <p>Situation</p>
          <p>Unknown</p>
        </TableBlock>
        <div>
          <p>
            This document has been prepared and checked in accordance with the
            CWBC's Quality Assurance procedures and authorised for release.
          </p>
          <p>Signed:</p>
          <TableBlock widths={[50, 50]}>
            <div>
              <img src="/sw-sig.png" alt="signature"></img>
              <p>Samuel Watt BSc (Hons) </p>
            </div>
            <div>
              <img src="/jc-sig.png" alt="signature"></img>
              <p>Jordan Clarke BSc (Hons) MRICS</p>
            </div>
          </TableBlock>
          <p>For and on behalf of Clarke & Watt Building Consultancy Limited</p>
        </div>
      </Page>
      <Page>
        <H1>Definitions</H1>
        <H2>Key</H2>
        <TableBlock widths={[90, 10]}>
          <ul>
            <li>
              For information purposes, generally, no repair is required.
              Property to be maintained as usual.
            </li>
          </ul>
          <p
            className="w-100-perc h-100-perc text-centre"
            style={{ backgroundColor: "green" }}
          ></p>
          <ul>
            <li>
              Defects requiring repair/replacement but not considered urgent nor
              serious. Property to be maintained as usual.
            </li>
          </ul>
          <p
            className="w-100-perc h-100-perc text-centre"
            style={{ backgroundColor: "orange" }}
          ></p>
          <ul>
            <li>
              Serious defects to be fully considered prior to purchase that need
              to be repaired, replace or investigated urgently.
            </li>
          </ul>
          <p
            className="w-100-perc h-100-perc text-centre"
            style={{ backgroundColor: "red" }}
          ></p>
          <ul>
            <li>Not inspected (see 'Important note' below)/</li>
          </ul>
          <p className="w-100-perc h-100-perc text-centre">
            <strong>NI</strong>
          </p>
        </TableBlock>
        <H2>Glossary of Terms</H2>
        <ul>
          <li>Immediate: Within 1 year</li>
          <li>Short Term: Within the next 1 to 3 years</li>
          <li>Medium Term: Within the next 4 to 10 years</li>
          <li>Long Term: Within the next 10 years </li>
        </ul>
        <H2>Crack Definitions (BRE Digest 251)</H2>
        <ul>
          <li>Category 0: Negligible (&gt; 0.1mm)</li>
          <li>Category 1: Very slight (Up to 1mm)</li>
          <li>Category 2: Slight (Up to 5mm)</li>
          <li>Category 3: Moderate (5 - 15mm)</li>
          <li>Category 4: Severe (15 - 25mm)</li>
          <li>Category 5: Very severe (&lt; 25 mm)</li>
        </ul>
      </Page>
      <Page>
        <H2>Typical House Diagram</H2>
        <img
          src="/typical-house.webp"
          alt="typical house"
          width="700"
          height="480"
        ></img>
      </Page>
      <Page>
        <H1>Description Of the Property</H1>
        <p>Unknown</p>
      </Page>
      <Page>
        <H2>Location Plan</H2>
        <p>
          Redline demarcations do not represent the legal boundary of the
          property and are for indicative purposes only.
        </p>
        <img></img>
      </Page>
      <Page>
        {form.elementSections.map((cs, i) => (
          <ConditionSection key={i} conditionSection={cs} />
        ))}
      </Page>
      <Page>
        <H1>Issues for your Legal Advisor</H1>
        <H2>Planning & Building Regulations</H2>
        <p>
          As mentioned within the body of this report, we strongly recommend
          that you obtain certificates and warranties from the Vendor relating
          to the electrical and gas installations, extensions, etc. to confirm
          that all fully comply with the Building Regulations.
        </p>
        <H2>Statutory</H2>
        <p>
          <ul>
            <li>
              Confirm all Statutory Approvals for all alteration and
              construction work. Obtain copies of all Approved Plans for any
              alterations or extensions to the property.
            </li>
            <li>
              Any rights or responsibilities for the maintenance and upkeep of
              jointly used services including drainage, gutters, downpipes and
              chimneys should be established.
            </li>
            <li>
              The right for you to enter the adjacent property to maintain any
              structure situated on or near the boundary and any similar rights
              your neighbour may have to enter onto your property.
            </li>
            <li>
              Any responsibilities to maintain access roads and driveways, which
              may not be adopted by the Local Authority, should be established.
            </li>
            <li>
              Obtain any certificates or guarantees, accompanying reports and
              plans for works that may have been carried out on the property.
              The guarantees should be formally assigned to you and preferably
              indemnified against eventualities such as contractors going out of
              business.
            </li>
            <li>
              Investigate if any fire, public health or other requirements or
              regulations are satisfied and that up-to-date certificates are
              available.
            </li>
            <li>
              Investigate any proposed use of adjoining land and clarify the
              likelihood of any future type of development, which could
              adversely affect this property.
            </li>
            <li>
              Where there are trees in the adjacent gardens, which are growing
              sufficiently close to the property to cause possible damage, we
              would suggest that the owners are notified of the situation.
            </li>
            <li>
              Whilst there were clearly defined physical boundaries to the site,
              these may not necessarily lie on the legal boundaries. These
              matters should be checked through your Solicitors.
            </li>
            <li>
              The tenure is assumed to be Freehold, or Long Leasehold subject to
              nil or nominal Chief or Ground Rent. Your legal adviser should
              confirm all details.
            </li>
            <li>
              Confirmation should be obtained that all main services are indeed
              connected. Confirmation should be obtained by the provision of
              service documentation, of when the electric and gas installations
              were last tested.
            </li>
          </ul>
        </p>
      </Page>
      <Page>
        <H2>Thermal Insulation & Energy Efficiency</H2>
        <p>
          As part of the marketing process, current regulations require the
          provision of an Energy Performance Certificate. Legal enquiries are
          advised to confirm that such a Certificate has been obtained. This
          document provides the usual information regarding advice on energy
          efficiency and thermal improvement, which will assist in potentially
          reducing heating expenditure. The property is currently listed as
          achieving a rating of 41 (E), with the potential to achieve 66 (D). We
          recommend reviewing the EPC Certificate and considering making the
          improvements listed therein. From 1 April 2018, under the Minimum
          Energy Efficiency Standards (MEES) 2015, it became illegal to lease a
          property with an F or G Energy Performance Certificate Rating. In the
          residential market, the regulations extend to all properties with a
          valid EPC on 1 April 2020. This report does not provide extended
          advice on Minimum Energy Efficiency Standards (MEES) Regulations
          (2015) and is not designed to be used as evidence for the PRS
          Exemption Register. The responsibility for complying with MEES is
          allocated to the landlord and/or owner of the property.
        </p>
      </Page>
      <Page>
        <H1>Risks</H1>
        <H2>Risks to the building</H2>
        <p>Unknown</p>
        <H2>Risks to the grounds</H2>
        <p>Unknown</p>
        <H2>Risks to the people</H2>
        <p>Unknown</p>
      </Page>
      <Page>
        <H1>Conclusion</H1>
      </Page>
    </TocContext.Provider>
  );
}

type ConditionSectionProps = {
  key: number;
  conditionSection: ElementSection;
};

const ConditionSection = ({ conditionSection }: ConditionSectionProps) => {
  const cs = conditionSection;

  if (!cs.isPartOfSurvey) return <></>;

  const images = getImagesFromFileList(cs.images);

  let tableRows = [];
  for (let i = 0; i < images.length; i = i + 2) {
    tableRows.push(
      <tr>
        <td>
          <img key={i} src={images[i]} width={200} />
        </td>
        {images.length >= i + 1 && (
          <td>
            <img key={i + 1} src={images[i + 1]} width={200} />
          </td>
        )}
      </tr>
    );
  }

  return (
    <>
      <h2>{cs.name}</h2>
      <div className="grid grid-cols-2 gap-4">
        <p>
          <strong className="text-red-500">Description:</strong>
        </p>
        <p>{cs.description}</p>
        <table style={{ width: "100%" }}>
          <tbody>{tableRows}</tbody>
        </table>
        <p>
          <strong>Defects:</strong>
        </p>
      </div>
    </>
  );
};
