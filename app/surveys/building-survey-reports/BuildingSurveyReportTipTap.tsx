/* eslint-disable @next/next/no-img-element */

import React from "react";
import Image from "next/image";
import type {
  BuildingSurveyFormData,
  ElementSection,
  MaterialComponent,
} from "./BuildingSurveyReportSchema";
import { v4 as uuidv4 } from "uuid";

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
    console.warn("Number of children should be a multiple of widths");

  const landscapeWidth = 948; // Width of the page in landscape

  let tableRows = [];
  for (let i = 0; i < childrenArray.length; i = i + widths.length) {
    let row = [];
    for (let j = 0; j < widths.length; j++) {
      const childElement = childrenArray[i + j];

      if (j === widths.length - 1) {
        row.push(<td key={j}>{childElement}</td>);
      } else {
        row.push(
          <td key={j} colwidth={`${landscapeWidth * (widths[j] / 100)}`}>
            {childElement}
          </td>
        );
      }
    }
    tableRows.push(<tr key={i}>{row}</tr>);
  }

  return (
    <table>
      <tbody>{tableRows}</tbody>
    </table>
  );
};

const Page = (props: React.PropsWithChildren<any>) => (
  <>
    {props.children}
    <hr />
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
  const inspectionDate = new Date(form.inspectionDate);

  console.debug("Building Survey Report", form);

  return (
    <>
      <Page>
        <TableBlock widths={[55, 45]}>
          <div>
            <Image
              style={{ margin: "0 auto" }}
              src="/typical-house.webp"
              alt="typical house"
              width="700"
              height="480"
            />
          </div>
          <div>
            <p style={{ textAlign: "right", fontSize: "1.5em" }}>
              Level 3 Building Survey Report
            </p>
            <p style={{ textAlign: "right" }}></p>
            <p style={{ textAlign: "right" }}>Of the premises known as</p>
            <p style={{ textAlign: "right" }}></p>
            {address.split(",").map((word, i) => (
              <p style={{ textAlign: "right" }} key={i} className="m-0">
                <strong>{word}</strong>
              </p>
            ))}
            <p style={{ textAlign: "right" }}></p>
            <p style={{ textAlign: "right" }}>For and on behalf of</p>
            <p style={{ textAlign: "right" }}></p>
            <p style={{ textAlign: "right" }}>
              <strong>{clientName}</strong>
            </p>
            <p style={{ textAlign: "right" }}></p>
            <p style={{ textAlign: "right" }}>Prepared By</p>
            <p style={{ textAlign: "right" }}>
              Clarke & Watt Building Consultancy Ltd
            </p>
            <p style={{ textAlign: "right" }}>Northern Assurance Building</p>
            <p style={{ textAlign: "right" }}>9-21 Princess Street</p>
            <p style={{ textAlign: "right" }}>Manchester</p>
            <p style={{ textAlign: "right" }}>M2 4DN</p>
            <p style={{ textAlign: "right" }}></p>
            <p style={{ textAlign: "right" }}>Email: admin@cwbc.co.uk</p>
            <p style={{ textAlign: "right" }}>
              Date: {reportDate.toDateString()}
            </p>
            <p style={{ textAlign: "right" }}>Ref: Unknown</p>
          </div>
        </TableBlock>
      </Page>
      <Page>
        <TableBlock widths={[40, 60]}>
          <p>Prepared by:</p>
          <p>Samuel Watt BSc (Hons)</p>
        </TableBlock>
        <p>
          This document has been prepared and checked in accordance with the
          CWBC's Quality Assurance procedures and authorised for release.
        </p>
        <p></p>
        <p>Signed:</p>
        <TableBlock widths={[50, 50]}>
          <div>
            {/* <Image src="/sw-sig.png" alt="signature" fill={true} /> */}
            <p>Samuel Watt BSc (Hons) </p>
          </div>
          <div>
            {/* <Image src="/jc-sig.png" alt="signature" fill={true} /> */}
            <p>Jordan Clarke BSc (Hons) MRICS</p>
          </div>
        </TableBlock>
        <p></p>
        <p>For and on behalf of Clarke & Watt Building Consultancy Limited</p>
        <TableBlock widths={[40, 60]}>
          <p>Inspection Date:</p>
          <p>{inspectionDate.toDateString()}</p>
          <p>Report Issue Date:</p>
          <p>{reportDate.toDateString()}</p>
          <p>Weather at the time of inspection:</p>
          <p>{form.weather}</p>
          <p>Orientation</p>
          <p>{form.orientation}</p>
          <p>Situation</p>
          <p>{form.situation}</p>
        </TableBlock>
      </Page>
      <Page>
        <p style={{ fontSize: "1.5em", marginBottom: "8mm" }}>Contents</p>
        <section id="toc"></section>
      </Page>
      <Page>
        <h1>Definitions</h1>
        <h2>Key</h2>
        <TableBlock widths={[94, 6]}>
          <ul>
            <li>
              For information purposes, generally, no repair is required.
              Property to be maintained as usual.
            </li>
          </ul>
          <p style={{ backgroundColor: "green" }}></p>
          <ul>
            <li>
              Defects requiring repair/replacement but not considered urgent
              nor serious. Property to be maintained as usual.
            </li>
          </ul>
          <p style={{ backgroundColor: "orange" }}></p>
          <ul>
            <li>
              Serious defects to be fully considered prior to purchase that
              need to be repaired, replace or investigated urgently.
            </li>
          </ul>
          <p style={{ backgroundColor: "red" }}></p>
          <ul>
            <li>Not inspected</li>
          </ul>
          <p className="w-100-perc h-100-perc text-centre">
            <strong>NI</strong>
          </p>
        </TableBlock>
        <p></p>
        <TableBlock widths={[50, 50]}>
          <div>
            <h2>Glossary of Terms</h2>
            <ul>
              <li>Immediate: Within 1 year</li>
              <li>Short Term: Within the next 1 to 3 years</li>
              <li>Medium Term: Within the next 4 to 10 years</li>
              <li>Long Term: Within the next 10 years </li>
            </ul>
          </div>
          <div>
            <h2>Crack Definitions (BRE Digest 251)</h2>
            <ul>
              <li>Category 0: Negligible (&gt; 0.1mm)</li>
              <li>Category 1: Very slight (Up to 1mm)</li>
              <li>Category 2: Slight (Up to 5mm)</li>
              <li>Category 3: Moderate (5 - 15mm)</li>
              <li>Category 4: Severe (15 - 25mm)</li>
              <li>Category 5: Very severe (&lt; 25 mm)</li>
            </ul>
          </div>
        </TableBlock>
      </Page>
      <Page>
        <h2>Typical House Diagram</h2>
        <Image
          src="/typical-house.webp"
          alt="typical house"
          width={800}
          height={800}
        />
      </Page>
      <Page>
        <h1>Description Of the Property</h1>
        <TableBlock widths={[50, 50]}>
          <h3>Property Type</h3>
          <p>{form.propertyDescription.propertyType.value}</p>
          <h3>Construction Details</h3>
          <p>{form.propertyDescription.constructionDetails.value}</p>
          <h3>Year of Construction</h3>
          <p>{form.propertyDescription.yearOfConstruction.value}</p>
          <h3>Year of Refurbishment</h3>
          <p>{form.propertyDescription.yearOfRefurbishment.value}</p>
          <h3>Grounds</h3>
          <p>{form.propertyDescription.grounds.value}</p>
          <h3>Services</h3>
          <p>{form.propertyDescription.services.value}</p>
          <h3>Other Services</h3>
          <p>{form.propertyDescription.otherServices.value}</p>
          <h3>Energy Rating</h3>
          <p>{form.propertyDescription.energyRating.value}</p>
          <h3>Number of Bedrooms</h3>
          <p>{form.propertyDescription.numberOfBedrooms.value}</p>
          <h3>Number of Bathrooms</h3>
          <p>{form.propertyDescription.numberOfBathrooms.value}</p>
          <h3>Tenure</h3>
          <p>{form.propertyDescription.tenure.value}</p>
        </TableBlock>
      </Page>
      <Page>
        <h2>Location Plan</h2>
        <p>
          Red line demarcations do not represent the legal boundary of the
          property and are to indicate the approximate areas of the property
          subject to inspection.
        </p>
        <img
          src="https://placehold.co/600x400"
          alt="placeholder"
          width="600"
          height="400"
        />
      </Page>
      <Page>
        <TableBlock widths={[50,50]}>
          {form.frontElevationImagesUri.map((uri, i) => 
            (<img src={uri} key={`frontElevation_img_${i}`} alt={`frontElevation_img_${i}`}></img>))}
        </TableBlock>
      </Page>
      <Page>
        {form.sections.map((s, i) => (
          <div key={s.name}>
            <h1>{s.name}</h1>
            {s.elementSections.map((cs, j) => (
              <>
                <ConditionSection key={`${i}.${j}`} elementSection={cs} />
              </>
            ))}
          </div>
        ))}
      </Page>
      <Page>
        <h1>Issues for your Legal Advisor</h1>
        <h2>Planning & Building Regulations</h2>
        <p>
          As mentioned within the body of this report, we strongly recommend
          that you obtain certificates and warranties from the Vendor relating
          to the electrical and gas installations, extensions, etc. to confirm
          that all fully comply with the Building Regulations.
        </p>
        <h2>Statutory</h2>
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
        <h2>Thermal Insulation & Energy Efficiency</h2>
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
        <h1>Risks</h1>
        <h2>Risks to the building</h2>
        <p>Unknown</p>
        <h2>Risks to the grounds</h2>
        <p>Unknown</p>
        <h2>Risks to the people</h2>
        <p>Unknown</p>
      </Page>
      <Page>
        <h1>Conclusion</h1>
      </Page>
    </>
  );
}

type ConditionSectionProps = {
  key: string;
  elementSection: ElementSection;
};

const ConditionSection = ({ elementSection }: ConditionSectionProps) => {
  const es = elementSection;

  if (!es.isPartOfSurvey) return <></>;

  let tableRows = [];
  for (let i = 0; i < es.images.length; i = i + 2) {
    tableRows.push(
      <tr>
        <td>
          <Image
            key={i}
            src={es.images[i]}
            alt={elementSection.name + ".image." + i }
            width={300}
            height={300}
          />
        </td>
        <td>
          {es.images.at(i + 1) && (
            <Image
              key={i + 1}
              src={es.images[i + 1]}
              alt={elementSection.name + ".image." + i }
              width={400}
              height={400}
            />
          )}
        </td>
      </tr>
    );
  }

  function mapRagToBackgroundColour(ragStatus: string): string {
    switch (ragStatus) {
      case "Green":
        return "green";
      case "Amber":
        return "orange";
      case "Red":
        return "red";
      default:
        return "white";
    }
  }

  return (
    <Page>
      <h2>{es.name}</h2>
      <p></p>
      <TableBlock widths={[10, 20, 70]}>
        <p></p>
        <p>
          <strong>Description</strong>
        </p>
        <p>{es.description}</p>
      </TableBlock>
      {es.materialComponents
      .map((mc) => ({ mc : mc, id: uuidv4() }))
      .map(({ mc, id }, i) => (
        <>
          <p></p>
          <TableBlock widths={[10, 20, 64, 6]} key={i}>
            <p id={id}></p>
            <h3 data-add-toc-here-id={id}>
              <strong>Component</strong>
            </h3>
            <p>{mc.useNameOveride ? mc.name : mc.id}</p>
            <p
              style={{
                backgroundColor: mapRagToBackgroundColour(mc.ragStatus),
              }}
            ></p>

            <p></p>
            <p>
              <strong>Condition / Defect</strong>
            </p>
            <div>
              {mc.defects.map((d) => (
                <p key={d.name}>
                  {d.name} - {d.description}
                </p>
              ))}
            </div>
            <p></p>
          </TableBlock>
        </>
      ))}
      <p></p>
      <div>
        <table style={{ width: "100%" }}>
          <tbody>{tableRows}</tbody>
        </table>
      </div>
    </Page>
  );
};
