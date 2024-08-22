/* eslint-disable @next/next/no-img-element */

import React from "react";
import Image from "next/image";
import type {
  BuildingSurveyFormData,
  ElementSection,
} from "./BuildingSurveyReportSchema";
import { v4 as uuidv4 } from "uuid";
import { report } from "process";

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
    <table style={{ margin: "0" }}>
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


interface H2Props {
  id: string;
}

const H2 = ({ id, children }: React.PropsWithChildren<H2Props>) => {
  return (
    <TableBlock widths={[6, 88, 6]}>
      <p id={id} style={{ fontWeight: "bold" }}></p>
      <h2
        data-add-toc-here-id={id}
        style={{ fontWeight: "bold", textAlign: "center" }}
      >
        {children}
      </h2>
      <p></p>
    </TableBlock>
  );
};

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
              src={form.moneyShot[0]}
              alt="main page image"
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
            <p style={{ textAlign: "right" }}>Email: {form.owner.email}</p>
            <p style={{ textAlign: "right" }}>
              Date: {reportDate.toDateString()}
            </p>
            <p style={{ textAlign: "right" }}>Ref: #{form.id[8]}</p>
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
          <Image style={{ width: "80mm" }} src={form.owner.signaturePath[0]} alt="signature" width={400} height={200} />
          <Image style={{ width: "80mm" }} src="https://placehold.co/600x400" alt="signature" width={400} height={200}  />
          <p>{form.owner.name}</p>
          <p>Jordan Clarke BSc (Hons) MRICS</p>
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
        <p
          style={{ fontSize: "1.5em", marginBottom: "8mm", fontWeight: "bold" }}
        >
          Contents
        </p>
        <section id="toc"></section>
      </Page>
      <Page>
        <h1 style={{ fontWeight: "bold" }}>Definitions</h1>
        <H2 id="key">Key</H2>      
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
              Defects requiring repair/replacement but not considered urgent nor
              serious. Property to be maintained as usual.
            </li>
          </ul>
          <p style={{ backgroundColor: "orange" }}></p>
          <ul>
            <li>
              Serious defects to be fully considered prior to purchase that need
              to be repaired, replace or investigated urgently.
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
            <h2 style={{ fontWeight: "bold" }}>Glossary of Terms</h2>
            <ul>
              <li>Immediate: Within 1 year</li>
              <li>Short Term: Within the next 1 to 3 years</li>
              <li>Medium Term: Within the next 4 to 10 years</li>
              <li>Long Term: Within the next 10 years </li>
            </ul>
          </div>
          <div>
            <h2 style={{ fontWeight: "bold" }}>
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
        <h2 style={{ fontWeight: "bold" }}>Typical House Diagram</h2>
        <Image
          style={{ margin: "0 auto" }}
          src="/typical-house.webp"
          alt="typical house"
          width={800}
          height={800}
        />
      </Page>
      <Page>
        <h1 style={{ fontWeight: "bold" }}>Description Of the Property</h1>
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
        <h3 style={{ fontWeight: "bold" }}>Location Plan</h3>
        <p style={{ textAlign: "justify" }}>
          Red line demarcations do not represent the legal boundary of the
          property and are to indicate the approximate areas of the property
          subject to inspection.
        </p>
        <p></p>
        <img
          style={{ margin: "0 auto", width: "180mm" }}
          src="https://placehold.co/600x400"
          alt="placeholder"
          width="600"
          height="400"
        />
      </Page>
      <Page>
        <TableBlock widths={[50, 50]}>
          {form.frontElevationImagesUri.map((uri, i) => (
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
            <h1 style={{ fontWeight: "bold" }}>{s.name}</h1>
            {s.elementSections.map((cs, j) => (
              <ConditionSection key={`${i}.${j}`} elementSection={cs} />
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
        <p>Unknown</p>
        <h2 style={{ fontWeight: "bold" }}>Risks to the grounds</h2>
        <p>Unknown</p>
        <h2 style={{ fontWeight: "bold" }}>Risks to the people</h2>
        <p>Unknown</p>
      </Page>
      <Page>
        <h1 style={{ fontWeight: "bold" }}>Conclusion</h1>
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
          will be provided. We visually inspect roofs, chimneys and other
          surfaces on the outside of the building from ground level and, if
          necessary, from neighbouring public property and with the help of
          binoculars. Flat roofs no more than 3m above ground level are
          inspected using a ladder where it is safe to do so. We inspect the
          roof structure from inside the roof space if there is safe access. We
          examine floor surfaces and under-floor spaces so far as there is safe
          access and permission from the owner. We are not able to assess the
          condition of the inside of any chimney, boiler or other flues. We do
          not lift fitted carpets or coverings without the owner's consent.
          Intermittent faults of services may not be apparent on the day of
          inspection. If we are concerned about parts of the property that the
          inspection cannot cover, the report will tell you about any further
          investigations that are needed. Where practicable and agreed we report
          on the cost of any work for identified repairs and make
          recommendations on how these repairs should be carried out. Some
          maintenance and repairs we suggest may be expensive. Purely cosmetic
          and minor maintenance defects that do not affect performance might not
          be reported. The report that we provide is not a warranty
        </p>
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
      <tr key={elementSection.id + "." + i}>
        <td>
          <Image
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
            <Image
              style={{ width: "500mm" }}
              key={i + 1}
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
      {es.materialComponents
        .map((mc) => ({ mc: mc, id: uuidv4() }))
        .map(({ mc, id }, i) => (
          <>
            <TableBlock widths={[10, 20, 64, 6]} key={i}>
              <p id={id}></p>
              <h3 data-add-toc-here-id={id}>
                <strong>Component</strong>
              </h3>
              <p>{mc.useNameOveride ? mc.name : mc.id}</p>
              <p
                style={{
                  fontWeight: "bold",
                  backgroundColor: mapRagToBackgroundColour(mc.ragStatus),
                }}
              >
                {mc.ragStatus === "N/I" ? "NI" : ""}
              </p>

              <p></p>
              <p>
                <strong>Condition / Defect</strong>
              </p>
              <div>
                {mc.defects.map((d) => (
                  <p style={{ textAlign: "justify" }} key={d.name}>{d.description}</p>
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
