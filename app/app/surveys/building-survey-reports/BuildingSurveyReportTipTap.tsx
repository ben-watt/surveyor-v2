/* eslint-disable @next/next/no-img-element */

import React, { Fragment, isValidElement } from "react";
import Image from "next/image";
import type {
  BuildingSurveyFormData,
  ElementSection,
} from "./BuildingSurveyReportSchema";
import { v4 as uuidv4 } from "uuid";
import { formatDateWithSuffix } from '@/app/app/utils/dateFormatters';

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
    throw new Error("Children must not be null or undefined or invalid");

  const createTableRows = (elements : React.ReactNode) : React.JSX.Element[]  => {
    const elementsArr = React.Children.toArray(elements);
  
    if (elementsArr.length % widths.length !== 0)
      console.warn("[Table Block]", "Number of children should be a multiple of widths", elementsArr.length, widths.length);

    const landscapeWidth = 928; // Width of the page in landscape
    let tableRows = [];
    for (let i = 0; i < elementsArr.length; i = i + widths.length) {
      const firstChildInRow = elementsArr[i];
      if (
        isValidElement<any>(firstChildInRow) &&
        firstChildInRow.type === Fragment
      ) {
        tableRows.push(...createTableRows(firstChildInRow.props.children));
        i = i - widths.length + 1;
        continue;
      }

      let rows = widths.map((w, j) => {
        if (j === widths.length - 1) {
          return <td key={j} colwidth={`${landscapeWidth * (widths[j] / 100)}`}>{elementsArr[i + j]}</td>;
        } else {
          return (
            <td key={j} colwidth={`${landscapeWidth * (widths[j] / 100)}`}>
              {elementsArr[i + j]}
            </td>
          );
        }
      });

      tableRows.push(<tr key={i}>{rows}</tr>);
    }

    return tableRows;
  }

  return (
    <table>
      <tbody>{createTableRows(children)}</tbody>
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

interface H2Props {
  id: string;
}

const H2 = ({ id, children }: React.PropsWithChildren<H2Props>) => {
  return (
    <TableBlock widths={[6, 88, 6]}>
      <p id={id} style={{ fontWeight: "bold" }}></p>
      <h2
        data-add-toc-here-id={id}
        style={{ fontWeight: "bold", fontSize: "14pt", textAlign: "center" }}
      >
        {children}
      </h2>
      <p></p>
    </TableBlock>
  );
};

const fallback = (value: any, fallbackValue: any) => {
  if(value === undefined || value === null) 
    return fallbackValue;
  
  switch (typeof value) {
    case "string":
      return value.length > 0 ? value : fallbackValue;
    case "number":
      return value === 0 ? value : fallbackValue;
    default:
      return fallbackValue;
  }
}

/// This must be a sync function
/// It needs to be rendered to a basic string rather than a react component
export default function PDF({ form }: PdfProps) {
  const clientName = form.reportDetails.clientName;
  const address = form.reportDetails.address;
  const reportDate = new Date(form.reportDetails.reportDate);
  const inspectionDate = new Date(form.reportDetails.inspectionDate);

  console.debug("Building Survey Report", form);

  return (
    <>
      <Page>
        <TableBlock widths={[55, 45]}>
          <div>
            <Image
              style={{ margin: "0 auto" }}
              src={form.reportDetails.moneyShot[0]}
              alt="main page image"
              width="700"
              height="480"
            />
          </div>
          <div>
            <p style={{ textAlign: "right", fontSize: "14pt", fontWeight: "bold" }}>
              Level {form.reportDetails.level} Building Survey Report
            </p>
            <p style={{ textAlign: "right" }}></p>
            <p style={{ textAlign: "right" }}>Of the premises known as</p>
            <p style={{ textAlign: "right" }}></p>
            <p style={{ textAlign: "right" }}  className="m-0">
              <strong>{address.formatted}</strong>
            </p>
            <p style={{ textAlign: "right" }}></p>
            <p style={{ textAlign: "right" }}>For and on behalf of</p>
            <p style={{ textAlign: "right" }}></p>
            <p style={{ textAlign: "right" }}>
              <strong>{clientName}</strong>
            </p>  
            <p style={{ textAlign: "right" }}></p>
            <p style={{ textAlign: "right" }}>Prepared by</p>
            <p style={{ textAlign: "right" }}>
              Clarke & Watt Building Consultancy Ltd
            </p>
            <p style={{ textAlign: "right" }}>Suite D</p>  
            <p style={{ textAlign: "right" }}>The Towers</p>  
            <p style={{ textAlign: "right" }}>Towers Business Park</p>
            <p style={{ textAlign: "right" }}>Wilmslow Road</p>
            <p style={{ textAlign: "right" }}>Manchester</p>
            <p style={{ textAlign: "right" }}>M20 2RY</p>
            <p style={{ textAlign: "right" }}></p>
            <p style={{ textAlign: "right", fontSize: "8pt" }}>Email: admin@cwbc.co.uk</p>

            <p style={{ textAlign: "right", fontSize: "8pt" }}>
              Date: {reportDate.toDateString()}
            </p>

            <p style={{ textAlign: "right", fontSize: "8pt" }}>Ref: #{form.id.substring(0,8)}</p>
          </div>
        </TableBlock>
      </Page>
      <Page>
        <TableBlock widths={[40, 60]}>
          <p>Prepared by:</p>
          <p>{form.owner.name}</p>
        </TableBlock>
        <p>
          This document has been prepared and checked in accordance with the
          CWBC's Quality Assurance procedures and authorised for release.
        </p>
        <p></p>
        <p>Signed:</p>
        <TableBlock widths={[50, 50]}>
          <Image
            style={{ width: "80mm" }}
            src={form.owner.signaturePath[0]}
            alt="signature"
            width={400}
            height={200}
          />
          <img
            style={{ width: "80mm" }}
            src="data:image/svg+xml,%3Csvg width='600' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='600' height='400' fill='%23cccccc'/%3E%3Ctext x='300' y='200' font-family='Arial' font-size='24' fill='%23666666' text-anchor='middle' dominant-baseline='middle'%3EPlaceholder%3C/text%3E%3C/svg%3E"
            alt="signature"
            width="400"
            height="200"
          />
          <p>{form.owner.name}</p>
          <p>Jordan Clarke BSc (Hons) MRICS</p>
        </TableBlock>
        <p></p>
        <p>For and on behalf of Clarke & Watt Building Consultancy Limited</p>
        <TableBlock widths={[40, 60]}>
          <p>Inspection Date:</p>
          <p>{formatDateWithSuffix(inspectionDate)}</p>
          <p>Report Issue Date:</p>
          <p>{formatDateWithSuffix(reportDate)}</p>
          <p>Weather at the time of inspection:</p>
          <p>{form.reportDetails.weather}</p>
          <p>Orientation</p>
          <p>{form.reportDetails.orientation}</p>
          <p>Situation</p>
          <p>{form.reportDetails.situation}</p>
        </TableBlock>
      </Page>
      <Page>
        <div id="toc" data-type="table-of-contents" data-toc-data="[]"></div>
      </Page>
      <Page>
        <h1 style={{ fontWeight: "bold", fontSize: "14pt" }}>Definitions</h1>
        <h2 style={{ fontWeight: "bold", fontSize: "14pt" }}>Key</h2>
        <TableBlock widths={[94, 6]}>
          <ul>
            <li>
              For information purposes, generally, no repair is required.
              Property to be maintained as usual.
            </li>
          </ul>
          <p style={{ textAlign: "center" }}>
            <mark style={{ backgroundColor: "green" }}>&nbsp;&nbsp;&nbsp;&nbsp;</mark>
          </p>
          <ul>
            <li>
              Defects requiring repair/replacement but not considered urgent nor
              serious. Property to be maintained as usual.
            </li>
          </ul>
          <p style={{ textAlign: "center" }}>
            <mark style={{ backgroundColor: "orange" }}>&nbsp;&nbsp;&nbsp;&nbsp;</mark>
          </p>
          <ul>
            <li>
              Serious defects to be fully considered prior to purchase that need
              to be repaired, replace or investigated urgently.
            </li>
          </ul>
          <p style={{ textAlign: "center" }}>
            <mark style={{ backgroundColor: "red" }}>&nbsp;&nbsp;&nbsp;&nbsp;</mark>
          </p>
          <ul>
            <li>Not inspected</li>
          </ul>
          <p style={{ textAlign: "center"}}>
            <strong>NI</strong>
          </p>
        </TableBlock>
        <p></p>
        <TableBlock widths={[50, 50]}>
          <div>
            <h2 style={{ fontWeight: "bold", fontSize: "14pt" }}>Glossary of Terms</h2>
            <ul>
              <li>Immediate: Within 1 year</li>
              <li>Short Term: Within the next 1 to 3 years</li>
              <li>Medium Term: Within the next 4 to 10 years</li>
              <li>Long Term: Within the next 10 years </li>
            </ul>
          </div>
          <div>
            <h2 style={{ fontWeight: "bold", fontSize: "14pt" }}>
              Crack Definitions (BRE Digest 251)
            </h2>
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
        <h2 style={{ fontSize: "14pt", fontWeight: "bold" }}>Typical House Diagram</h2>
        <img
          style={{ margin: "0 auto" }}
          src="/typical-house.webp"
          alt="typical house"
          width={800}
        />
      </Page>
      <Page>
        <h1 style={{ fontSize: "14pt", fontWeight: "bold" }}>Description Of the Property</h1>
        <TableBlock widths={[50, 50]}>
          <h3 style={{ fontWeight: "bold" }}>Property Type</h3>
          <p>{form.propertyDescription.propertyType.value}</p>
          <h3 style={{ fontWeight: "bold" }}>Construction Details</h3>
          <p>{form.propertyDescription.constructionDetails.value}</p>
          <h3 style={{ fontWeight: "bold" }}>Year of Construction</h3>
          <p>{form.propertyDescription.yearOfConstruction.value}</p>
          <h3 style={{ fontWeight: "bold" }}>Year of Extensions</h3>
          <p>

            {fallback(form.propertyDescription.yearOfExtensions.value, "N/A")}
          </p>
          <h3 style={{ fontWeight: "bold" }}>Year of Conversions</h3>
          <p>
            {fallback(form.propertyDescription.yearOfConversions.value, "N/A")}

          </p>
          <h3 style={{ fontWeight: "bold" }}>Grounds</h3>
          <p>{form.propertyDescription.grounds.value}</p>
          <h3 style={{ fontWeight: "bold" }}>Services</h3>
          <p>{form.propertyDescription.services.value}</p>
          <h3 style={{ fontWeight: "bold" }}>Other Services</h3>
          <p>{form.propertyDescription.otherServices.value}</p>

          <h3 style={{ fontWeight: "bold" }}>Energy Rating</h3>
          <p>{form.propertyDescription.energyRating.value}</p>
          <h3 style={{ fontWeight: "bold" }}>Number of Bedrooms</h3>
          <p>{form.propertyDescription.numberOfBedrooms.value}</p>
          <h3 style={{ fontWeight: "bold" }}>Number of Bathrooms</h3>
          <p>{form.propertyDescription.numberOfBathrooms.value}</p>

          <h3 style={{ fontWeight: "bold" }}>Tenure</h3>
          <p>{form.propertyDescription.tenure.value}</p>
        </TableBlock>

      </Page>
      <Page>
        <h3 style={{ fontSize: "14pt", fontWeight: "bold" }}>Location Plan</h3>
        <p style={{ textAlign: "justify" }}>
          Red line demarcations do not represent the legal boundary of the
          property and are to indicate the approximate areas of the property
          subject to inspection.
        </p>
        <p></p>
        <img
          style={{ margin: "0 auto", width: "180mm" }}
          src="data:image/svg+xml,%3Csvg width='600' height='400' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='600' height='400' fill='%23cccccc'/%3E%3Ctext x='300' y='200' font-family='Arial' font-size='24' fill='%23666666' text-anchor='middle' dominant-baseline='middle'%3ELocation Plan Placeholder%3C/text%3E%3C/svg%3E"
          alt="placeholder"
          width="600"
          height="400"
        />
      </Page>
      <Page>
        <TableBlock widths={[50, 50]}>
          {form.reportDetails.frontElevationImagesUri.map((uri, i) => (
            <img
              src={uri}
              key={`frontElevation_img_${i}`}
              alt={`frontElevation_img_${i}`}
            ></img>
          ))}
        </TableBlock>
      </Page>
      <Page>
        {form.sections.map((s, i) => (
          <div key={s.name}>
            <h1 style={{ fontSize: "14pt", fontWeight: "bold" }}>{s.name}</h1>
            {s.elementSections.map((cs, j) => (
              <ConditionSection
                key={`${s.name}.${cs.name}`}
                elementSection={cs}
                form={form}
              />
            ))}
          </div>
        ))}
      </Page>
      <Page>
        <h1 style={{ fontWeight: "bold" }}>Issues for your Legal Advisor</h1>
        <h2 style={{ fontWeight: "bold" }}>Planning & Building Regulations</h2>
        <p style={{ textAlign: "justify" }}>
          As mentioned within the body of this report, we strongly recommend
          that you obtain certificates and warranties from the Vendor relating
          to the electrical and gas installations, extensions, etc. to confirm
          that all fully comply with the Building Regulations.
        </p>
        <h2 style={{ fontWeight: "bold" }}>Statutory</h2>
        <TableBlock widths={[10, 90]}>
          <h3>&nbsp;</h3>
          <ul>
            <li>
              <p style={{ textAlign: "justify" }}>
                Confirm all Statutory Approvals for all alteration and
                construction work. Obtain copies of all Approved Plans for any
                alterations or extensions to the property.
              </p>
            </li>
          </ul>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <p></p>
          <ul>
            <li>
              <p style={{ textAlign: "justify" }}>
                Any rights or responsibilities for the maintenance and upkeep of
                jointly used services including drainage, gutters, downpipes and
                chimneys should be established.
              </p>
            </li>
          </ul>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <p></p>
          <ul>
            <li>
              <p style={{ textAlign: "justify" }}>
                The right for you to enter the adjacent property to maintain any
                structure situated on or near the boundary and any similar
                rights your neighbour may have to enter onto your property.
              </p>
            </li>
          </ul>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <p></p>
          <ul>
            <li>
              <p style={{ textAlign: "justify" }}>
                Any responsibilities to maintain access roads and driveways,
                which may not be adopted by the Local Authority, should be
                established.
              </p>
            </li>
          </ul>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <p></p>
          <ul>
            <li>
              <p style={{ textAlign: "justify" }}>
                Obtain any certificates or guarantees, accompanying reports and
                plans for works that may have been carried out on the property.
                The guarantees should be formally assigned to you and preferably
                indemnified against eventualities such as contractors going out
                of business.
              </p>
            </li>
          </ul>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <p></p>
          <ul>
            <li>
              <p style={{ textAlign: "justify" }}>
                Investigate if any fire, public health or other requirements or
                regulations are satisfied and that up-to-date certificates are
                available.
              </p>
            </li>
          </ul>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <p></p>
          <ul>
            <li>
              <p style={{ textAlign: "justify" }}>
                Investigate any proposed use of adjoining land and clarify the
                likelihood of any future type of development, which could
                adversely affect this property.
              </p>
            </li>
          </ul>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <p></p>
          <ul>
            <li>
              <p style={{ textAlign: "justify" }}>
                Where there are trees in the adjacent gardens, which are growing
                sufficiently close to the property to cause possible damage, we
                would suggest that the owners are notified of the situation.
              </p>
            </li>
          </ul>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <p></p>
          <ul>
            <li>
              <p style={{ textAlign: "justify" }}>
                Whilst there were clearly defined physical boundaries to the
                site, these may not necessarily lie on the legal boundaries.
                These matters should be checked through your Solicitors.
              </p>
            </li>
          </ul>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <p></p>
          <ul>
            <li>
              <p style={{ textAlign: "justify" }}>
                The tenure is assumed to be Freehold, or Long Leasehold subject
                to nil or nominal Chief or Ground Rent. Your legal adviser
                should confirm all details.
              </p>
            </li>
          </ul>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <p></p>
          <ul>
            <li>
              <p style={{ textAlign: "justify" }}>
                Confirmation should be obtained that all main services are
                indeed connected. Confirmation should be obtained by the
                provision of service documentation, of when the electric and gas
                installations were last tested.
              </p>
            </li>
          </ul>
        </TableBlock>
      </Page>
      <Page>
        <h2 style={{ fontWeight: "bold" }}>
          Thermal Insulation & Energy Efficiency
        </h2>
        <TableBlock widths={[10, 90]}>
          <h3>&nbsp;</h3>
          <p style={{ textAlign: "justify" }}>
            As part of the marketing process, current regulations require the
            provision of an Energy Performance Certificate. Legal enquiries are
            advised to confirm that such a Certificate has been obtained. This
            document provides the usual information regarding advice on energy
            efficiency and thermal improvement, which will assist in potentially
            reducing heating expenditure. The property is currently listed as
            achieving a rating of 58 (D), with the potential to achieve 78 (C).
            We recommend reviewing the EPC Certificate and considering making
            the improvements listed therein
          </p>
          <p></p>
          <p style={{ textAlign: "justify" }}>
            From 1 April 2018, under the Minimum Energy Efficiency Standards
            (MEES) 2015, it became illegal to lease a property with an F or G
            Energy Performance Certificate Rating. In the residential market,
            the regulations extend to all properties with a valid EPC on 1 April
            2020. This report does not provide extended advice on Minimum Energy
            Efficiency Standards (MEES) Regulations (2015) and is not designed
            to be used as evidence for the PRS Exemption Register. The
            responsibility for complying with MEES is allocated to the landlord
            and/or owner of the property.
          </p>
        </TableBlock>
      </Page>
      <Page>
        <h1 style={{ fontWeight: "bold" }}>Risks</h1>
        <h2 style={{ fontWeight: "bold" }}>Risks to the building</h2>
        <RiskRow
          id={"timber-rot"}
          risk={"Timber rot and insect damage"}
          description={`We have been unable to assess the condition of all timber elements
            and walls of the property due to furniture and building fabric
            obstructing our view and we are therefore unable to confirm that
            these areas are free from damp, rot, or insect infestation. Given
            the lack of and obstructed air vents serving the subfloor void,
            there is a risk that concealed areas are decayed and should be
            investigated further.`}
        />
        <RiskRow
          id={"tree-proximity"}
          risk={"Tree proximity"}
          description={`The presence of mature trees near a building can cause structural damage to foundations by directly displacing them,
decreasing, or indeed increasing, the amount of moisture to be drawn from the certain types of soil causing it to shrink and
expand, as well as negatively affecting drainage causing subsidence. The risk posed is subject to the following:
* Proximity of the tree * the height, age and species of the tree *the design and depth of the building's foundations *the type
of sub-soil
A mature tree is present in the rear garden, located close to the raised patio. The tree could be contrubiting to the movement
observed to the wall. However, there was no evidence to suggest that this is causing any structural issues to the property.`}
        />
        <RiskRow
          id={"flood-risk"}
          risk={"Flood Risk"}
          description={`We have not undertaken detailed investigations into the potential for flooding of the land on which the property lies. However,
we have consulted the Environmental Agency website at www.environment-agency.gov.uk and their information regarding
the potential for flooding identifies the site as being at very low flood risk from surface water and very-low flood risk from rivers
or the sea. For more information, please visit https://check-long-term-flood-risk.service.gov.uk/risk.
The property owner should stay informed about local flood alerts and maintain regular communication with relevant authorities.
Given the high risk of surface water flooding, you should ensure that your insurance policy covers for flood damage and expect
to pay higher premiums in light of this information.`}
        />
        <h2 style={{ fontWeight: "bold" }}>Risks to the grounds</h2>
        <RiskRow
          id={"invasive-species"}
          risk={"Invasive species"}
          description={`None noted at the time of inspection.`}
        />
        <h2 style={{ fontWeight: "bold" }}>Risks to the people</h2>
        <RiskRow
          id={"asbestos"}
          risk={"Asbestos"}
          description={`Given the age of the property, there is a likelihood that there are areas of ACMs within the property which have been
concealed. Under the Control of Asbestos Regulations 2012, you are required to commission a Refurbishment and Demolition
(R&D) Asbestos survey before commencing any refurbishment works.`}
        />
        <RiskRow
          id={"radon-risk"}
          risk={"Radon risk"}
          description={`Given the age of the property, there is a likelihood that there are areas of ACMs within the property which have been
concealed. Under the Control of Asbestos Regulations 2012, you are required to commission a Refurbishment and Demolition
(R&D) Asbestos survey before commencing any refurbishment works.`}
        />
        <RiskRow
          id={"electromagnetic-fields"}
          risk={"Electromagnetic fields"}
          description={`During our inspection, we did not note the presence of any mobile phone transmission masts affixed to either the land or
surrounding buildings. There is concern that electromagnetic fields from both natural and artificial sources can cause a wide
range of illnesses such as blackouts, insomnia and headaches to depression, allergies and cancer. Artificial sources
commonly comprise overhead or subterranean high voltage electrical power cables. It is suggested that the electrical
discharges from these high voltage cables upset the balance of minute electrical impulses employed by the human body to
regulate itself in much the same way as television and radio signals can be disrupted. This subject is still largely controversial
with further scientific research required. Further information on this matter can be found on the National Radiological Protection
Board's website. We have not undertaken any separate inquiries with the relevant statutory authority.`}
        />
      </Page>
      <Page>
        <h1 style={{ fontWeight: "bold" }}>Conclusion</h1>
        <TableBlock widths={[10, 90]}>
          <h3>&nbsp;</h3>
          <p style={{ textAlign: "justify" }}>
            The property is in sound structural condition with no significant
            structural defects noted.
          </p>
          <h3>&nbsp;</h3>
          <p style={{ textAlign: "justify" }}>
            External repairs were identified which have generally resulted from
            a lack of maintenance and ill-conceived repairs. These include
            slipped and damaged roof tiles, aged and poorly installed lead
            flashings, cement render to presumed solid masonry walls and a lack
            of air vents to the original subfloor void.. These issues need to be
            addressed to ensure the longevity of the property and to prevent
            more costly repairs in the long term.
          </p>
          <h3>&nbsp;</h3>
          <p style={{ textAlign: "justify" }}>
            Internally, the property exhibits reasonable condition. We noted
            that chimney breasts would benefit from having air vents installed.
          </p>
          <h3>&nbsp;</h3>
          <p style={{ textAlign: "justify" }}>
            We recommend that you obtain all testing and commissioning
            certificates relating to the electrical and gas installations etc.
            and obtain Final Certificates and engineer's calculations for the
            structural alterations and extensions to confirm that they were
            designed and installed in compliance with the Building Regulations.
          </p>
          <h3>&nbsp;</h3>
          <p style={{ textAlign: "justify" }}>
            Furthermore, we recommend a CCTV drainage survey to ascertain the
            condition of the underground drainage pipework and the septic tank.
          </p>
          <h3>&nbsp;</h3>
          <p style={{ textAlign: "justify" }}>
            The property should remain in reasonable condition should all
            repairs recommended be undertaken, however, you should fully
            consider the financial implications associated with the repairs
            identified before proceeding with the purchase of the property.
          </p>
          <h3>&nbsp;</h3>
          <p style={{ textAlign: "justify" }}>
            We recommend that your solicitor reviews legal information and
            information returned from local searches to ascertain whether there
            are any elements of concern.
          </p>
        </TableBlock>
        <p>
          We trust this Report is satisfactory for your present requirements and
          if you wish to discuss matters further, please contact:
        </p>
        <p>
          <strong>{form.owner.name}</strong>
        </p>
        <p>
          <strong>E:{form.owner.email}</strong>
        </p>
      </Page>
      <Page>
        <h1 style={{ fontWeight: "bold" }}>APPENDIX 1 - Limitations</h1>
        <TableBlock widths={[10, 90]}>
          <h2 style={{ fontWeight: "bold" }}>&nbsp;</h2>
          <p style={{ textAlign: "justify" }}>
            Our Report concentrates on the general standard and condition of the
            building and any principal defects or shortcomings and is not
            intended to be a report listing all items of repair, redecoration or
            reinstatement works.
          </p>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <h2 style={{ fontWeight: "bold" }}>&nbsp;</h2>
          <p style={{ textAlign: "justify" }}>
            This report is based on a visual inspection of the readily
            accessible areas of the property only and in accordance with the
            limitations contained in our Scope of Service provided previously.
            No steps were taken to expose elements of the structure otherwise
            concealed or to remove surface finishes for the examination of
            underlying elements. As such, we are unable to confirm that
            inaccessible and concealed parts of the property are free from
            defects.
          </p>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <h2 style={{ fontWeight: "bold" }}>&nbsp;</h2>
          <p style={{ textAlign: "justify" }}>
            We were not instructed to make arrangements for specialist surveys
            of the drainage installations, the water distribution systems, the
            mechanical systems or the electrical systems or for these to be
            tested by a specialist. We have, however, made recommendations where
            we believe that tests should be carried out and made a brief comment
            where something has been found from a visual inspection to be
            obviously defective.
          </p>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <h2 style={{ fontWeight: "bold" }}>&nbsp;</h2>
          <p style={{ textAlign: "justify" }}>
            We have not been instructed to organise a structural assessment to
            determine floor loadings.
          </p>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <h2 style={{ fontWeight: "bold" }}>&nbsp;</h2>
          <p style={{ textAlign: "justify" }}>
            We have not been instructed to establish the capacity of the
            electrical incoming supply nor to ascertain whether any other live
            services are connected to the premises.
          </p>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <h2 style={{ fontWeight: "bold" }}>&nbsp;</h2>
          <p style={{ textAlign: "justify" }}>
            We have not carried out any geological survey or site investigation
            and cannot confirm the nature or characteristics of the soil with
            regards to fill or possible contamination. Normal legal searches
            should confirm the past use of the site and if instructed, we will
            advise further.
          </p>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <h2 style={{ fontWeight: "bold" }}>&nbsp;</h2>
          <p style={{ textAlign: "justify" }}>
            Our examination of the roof covering and roof features such as
            chimneys, skylights, etc. were confined to an inspection from ground
            level
          </p>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <h2 style={{ fontWeight: "bold" }}>&nbsp;</h2>
          <p style={{ textAlign: "justify" }}>
            Subject to the client's requirements, they may not wish to proceed
            with all works, but do so that their own risk. The list of works is
            by no means exhaustive. The works listed are considered necessary to
            prevent further deterioration of the property. Further
            investigations may reveal additional works and thus greater
            expenditure. The costs are subject to a competitively sought tender
            process and are intended for budgeting purposes only. All costs
            provided are exclusive of VAT, professional fees and access unless
            expressly stated.
          </p>
        </TableBlock>
        <TableBlock widths={[10, 90]}>
          <h2 style={{ fontWeight: "bold" }}>&nbsp;</h2>
          <p style={{ textAlign: "justify" }}>
            This Report has been prepared for the sole use of {clientName}.
          </p>
        </TableBlock>
      </Page>
      <Page>
        <p>Important Note:</p>
        <p></p>
        <p style={{ textAlign: "justify" }}>
          We carry out a desk-top study and make oral enquiries for information
          about matters affecting the property. We carefully and thoroughly
          inspect the property using our best endeavours to see as much of it as
          is physically accessible. Where this is not possible an explanation
          will be provided.
        </p>
        <p></p>
        <p style={{ textAlign: "justify" }}>
          We visually inspect roofs, chimneys and other surfaces on the outside
          of the building from ground level and, if necessary, from neighbouring
          public property and with the help of binoculars. Flat roofs no more
          than 3m above ground level are inspected using a ladder where it is
          safe to do so. We inspect the roof structure from inside the roof
          space if there is safe access.
        </p>
        <p></p>
        <p style={{ textAlign: "justify" }}>
          We examine floor surfaces and under-floor spaces so far as there is
          safe access and permission from the owner. We are not able to assess
          the condition of the inside of any chimney, boiler or other flues. We
          do not lift fitted carpets or coverings without the owner's consent.
          Intermittent faults of services may not be apparent on the day of
          inspection.
        </p>
        <p></p>
        <p style={{ textAlign: "justify" }}>
          If we are concerned about parts of the property that the inspection
          cannot cover, the report will tell you about any further
          investigations that are needed. Where practicable and agreed we report
          on the cost of any work for identified repairs and make
          recommendations on how these repairs should be carried out. Some
          maintenance and repairs we suggest may be expensive. Purely cosmetic
          and minor maintenance defects that do not affect performance might not
          be reported. The report that we provide is not a warranty.
        </p>
      </Page>
    </>
  );
}

type ConditionSectionProps = {
  key: string;
  elementSection: ElementSection;
  form: BuildingSurveyFormData;
};

const ConditionSection = ({ elementSection, form }: ConditionSectionProps) => {
  const es = elementSection;

  if (!es.isPartOfSurvey) return <></>;

  let tableRows = [];
  for (let i = 0; i < es.images.length; i = i + 2) {
    tableRows.push(
      <tr key={`${elementSection.id}.${i}`}>
        <td>
          <img
            style={{ width: "500mm" }}
            key={i}
            src={es.images[i]}
            alt={elementSection.name + ".image." + i}
            width={300}
            height={300}
          />
        </td>
        <td>
          {es.images.at(i + 1) && (
            <img
              style={{ width: "500mm" }}
              key={`${elementSection.id}.${i + 1}`}
              src={es.images[i + 1]}
              alt={elementSection.name + ".image." + i}
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
      <H2 id={es.id}>{es.name}</H2>
      <TableBlock widths={[10, 20, 70]}>
        <p></p>
        <p>
          <strong>Description</strong>
        </p>
        <p>{es.description}</p>
      </TableBlock>
      {es.components
        .map((mc) => ({ mc: mc, id: uuidv4() }))
        .map(({ mc, id }, i) => (
          <>
            <TableBlock widths={[10, 20, 64, 6]} key={`${elementSection.id}.${i}`}>
              <p id={id}></p>
              <h3 data-add-toc-here-id={id}>
                <strong>Component</strong>
              </h3>
              <p>{mc.useNameOverride ? mc.nameOverride : mc.name}</p>
              <p
                style={{
                  fontWeight: "bold",
                  textAlign: "center",
                  fontSize: "18pt"
                }}
              >
                {mc.ragStatus === "N/I" ? "NI" : <mark style={{ backgroundColor: mapRagToBackgroundColour(mc.ragStatus)}}>&nbsp;&nbsp;&nbsp;&nbsp;</mark>}
              </p>
              <p></p>
              <p>
                <strong>Condition / Defect</strong>
              </p>
              <div>
                {mc.conditions.map((d) => (
                  <p style={{ textAlign: "justify" }} key={d.name}>
                    {d.phrase}
                  </p>
                ))}
              </div>
              <p></p>

              {form.reportDetails.level === "3" && (
                <>
                  <p></p>
                  <p style={{ "fontWeight" : "500" }}>Budget Cost</p>
                  <p>£{mc.costings[0].cost}</p>
                  <p></p>
                </>
              )}
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

interface RiskRowProps {
  id: string;
  risk: string;
  description?: string;
};

const RiskRow = ({id, risk, description} : RiskRowProps) => {
  return (
    <TableBlock widths={[10, 20, 64, 6]}>
      <p id={id}></p>
      <h3 data-add-toc-here-id={id}>{risk}</h3>
      <p>{description}</p>
      <p></p>
    </TableBlock>
  );
}