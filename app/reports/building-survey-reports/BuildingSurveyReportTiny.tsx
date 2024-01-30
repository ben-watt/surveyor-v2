import React, { useContext } from "react";
import type { BuildingSurveyData, ConditionSection } from "./BuildingSurveyReportData";
import { DefaultTocProvider, TocContext, TocProvider } from "../../components/Toc";


const TableBlock = ({ children, widths  }: { children: React.ReactNode, widths: number[] }) => {

  if(widths.reduce((a, b) => a + b, 0) !== 100)
    throw new Error("Widths must add up to 100");

  if(children === null || children === undefined)
    throw new Error("Children must not be null or undefined");

  const childrenArray = React.Children.toArray(children);
  if(childrenArray.length % widths.length !== 0)
    throw new Error("Number of children must be a multiple of widths");
  
  let tableRows = [];
  for(let i = 0; i < childrenArray.length; i = i + widths.length) {
    let row = [];
    for(let j = 0; j < widths.length; j++) {
      row.push(<td key={j} className={"w-" + widths[j] + "-perc " + "text-top"}>{childrenArray[i + j]}</td>)
    }
    tableRows.push(<tr key={i}>{row}</tr>);
  }

  return (
    <table className="w-100-perc">
      <tbody>
        {tableRows}
      </tbody>
    </table>
  )
}


const ContentBlock = ({ children, tocProvider }: { children: React.ReactNode,  tocProvider: TocProvider  }) => {
  let firstElement = null;
  if(Array.isArray(children)) {
    firstElement = children[0]
  } else {
    firstElement = children;
  }

  let dynamicElement = React.createElement(firstElement.type, { children: tocProvider(firstElement.type) });

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
}


interface PProps extends React.PropsWithChildren<any> {}

const P = (props: PProps) => {
  const tocProvider = useContext(TocContext);
  
  return (
    <ContentBlock tocProvider={tocProvider}>
      <p>{props.children}</p>
    </ContentBlock>
  )
}

const H1 = (props: PProps) => {
  const tocProvider = useContext(TocContext);
  return (
    <ContentBlock tocProvider={tocProvider}>
      <h1>{props.children}</h1>
    </ContentBlock>
  )
}

const H2 = (props: PProps) => {
  const tocProvider = useContext(TocContext);
  return (
    <ContentBlock tocProvider={tocProvider}>
      <h2>{props.children}</h2>
    </ContentBlock>
  )
}


const getImagesFromFileList = (fileList: FileList) => {
  const images = [];

  if(fileList === null || fileList === undefined)
    return new Image(100, 100);

  for(let i = 0; i < fileList.length; i++) {
    images.push(URL.createObjectURL(new Blob([fileList[i]], { type: "image/*" })));
  }

  return images;
}

const Page = (props: React.PropsWithChildren<any>) => 
    (<><section className={"mt-8 mb-8 " + props.className}>{props.children}</section><p>---------</p></>);

export default ({ form }: { form: BuildingSurveyData }) => {
  console.log(form);
  const clientName = form.clientName;
  const address = form.address;

  return (
    <TocContext.Provider value={DefaultTocProvider()}>
      <img src="/cwbc-logo.webp" alt="cwbc logo" />
      <Page className="text-right">
        <h1>Building Survey Report</h1>
        <p></p>
        <div>
          <p>Of the premises known as</p>
          {address.split(",").map((word, i) => (<p key={i} className="m-0"><strong>{word}</strong></p>))}
        </div>
        <p></p>
        <div>
          <p>For and on behalf of</p>
          <p><strong>{clientName}</strong></p>
        </div>
        <p></p>
        <div>
          <p>Prepared By</p>
          <p>Clarke & Watt Building Consultancy Ltd</p>
          <div>
            <p className="m-0">Charter House</p>
            <p className="m-0">33 Greek Street</p>
            <p className="m-0">Stockport</p>
            <p className="m-0">SK3 8AX</p>
          </div>
        </div>
        <p></p>
        <div className="text-sm">
          <p className="m-0">Email: sam.watt@cwbc.co.uk</p>
          <p className="m-0">Date: {form.reportDate.toDateString()}</p>
          <p className="m-0">Ref: 23.120 </p>
        </div>
      </Page>
      <Page className="text-center">
        <img src={getImagesFromFileList(form.frontElevationImage)[0]} alt="front elevation" width="80%" height="80%"/>
        <p><strong>{address}</strong></p>
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
          <p>{form.reportDate.toDateString()}</p>
          <p>Report Issue Date:</p>
          <p>{form.reportDate.toDateString()}</p>
        </TableBlock>
        <div>
          <p>This document has been prepared and checked in accordance with the CWBC’s Quality Assurance procedures and authorised for release.</p>
          <p>Signed:</p>
          <TableBlock widths={[50,50]}>
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
        <H1>Introduction</H1>
        <H2>Instruction</H2>
        <P>
          Clarke & Watt Building Consultancy Limited were instructed by{" "}
          {clientName} to carry out a Building Survey and to prepare a report
          advising on the general state of repair and condition of {address}
        </P>
        <P>
          We understand that the purpose of the inspection is in connection with
          the proposed sale of {address}, to satisfy concerns raised by the
          prospective buyer's lender in relation to their 'nil' valuation of the
          property
        </P>
        <H2>Limitations</H2>
        <P>
          Our Report concentrates on the general standard and condition of the
          building and any principal defects or shortcomings and is not intended
          to be a report listing all items of repair, redecoration or
          reinstatement works.
        </P>
        <P>
          This report is based on a visual inspection of the readily accessible
          areas of the property only and in accordance with the limitations
          contained in our Scope of Service provided previously. No steps were
          taken to expose elements of the structure otherwise concealed or to
          remove surface finishes for the examination of underlying elements. As
          such, we are unable to confirm that inaccessible and concealed parts
          of the property are free from defects.
        </P>
        <P>
          We were not instructed to make arrangements for specialist surveys of
          the drainage installations, the water distribution systems, the
          mechanical systems or the electrical systems or for these to be tested
          by a specialist. We have, however, made recommendations where we
          believe that tests should be carried out and made a brief comment
          where something has been found from a visual inspection to be
          obviously defective.
        </P>
        <P>
          We have not been instructed to organise a structural assessment to
          determine floor loadings.
        </P>
        <P>
          We have not been instructed to establish the capacity of the
          electrical incoming supply nor to ascertain whether any other live
          services are connected to the premises.
        </P>
        <P>
          We have not carried out any geological survey or site investigation
          and cannot confirm the nature or characteristics of the soil with
          regards to fill or possible contamination. Normal legal searches
          should confirm the past use of the site and if instructed, we will
          advise further.
        </P>
        <P>
          Our examination of the roof covering and roof features such as
          chimneys, skylights, etc. were confined to an inspection from ground
          level.
        </P>
        <P>
          Subject to the client's requirements, they may not wish to proceed
          with all works, but do so that their own risk. The list of works is by
          no means exhaustive. The works listed are considered necessary to
          prevent further deterioration of the property. Further investigations
          may reveal additional works and thus greater expenditure. The costs
          are subject to a competitively sought tender process and are intended
          for budgeting purposes only. All costs provided are exclusive of VAT,
          professional fees and access unless expressly stated.
        </P>
        <P>
          No internal access was provided to the garage, and we can therefore
          only provide comment on the visible external elements of the garage.
        </P>
        <P>
          This Report has been prepared for the sole use of {clientName}. NOTE.
          Permission is hereby granted for the contents of this survey to be
          circulated to all relevant parties involved in the sale / acquisition
          of the property.
        </P>
        <H2>Information Provided</H2>
        <P>We were provided with the following information prior to our inspection:</P>
        <TableBlock widths={[10, 90]}>
          <p></p>
          <ul>
            <li>Electronic copy of the particulars from Sleigh & Son Estage Agents</li>
          </ul>
        </TableBlock>
        
        <P>If any other information is made available this could affect the conclusions we have reached in this Report.</P>
        <H2>Date of Inspection</H2>
        <P> Our inspection was undertaken on {form.reportDate.toDateString()} at which time the weather was dry, cool, and overcast with a period of rain prior to the survey. </P>
        <P>The inspection was undertaken by Sam Watt BSc (Hons) on behalf of Clarke & Watt Building Consultancy Limited</P>
      </Page>
      <Page>
        <H1>Definitions</H1>
        <H2>Key</H2>
        <TableBlock widths={[90, 10]}>
          <ul>
            <li>For information purposes, generally, no repair is required. Property to be maintained as usual.</li>
          </ul>
          <p className="bg-color-green w-100-perc h-100-perc text-centre"></p>
          <ul>
            <li>Defects requiring repair/replacement but not considered urgent nor serious. Property to be maintained as usual.</li>
          </ul>
          <p className="bg-color-amber w-100-perc h-100-perc text-centre"></p>
          <ul>
            <li>Serious defects to be fully considered prior to purchase that need to be repaired, replace or investigated urgently.</li>
          </ul>
          <p className="bg-color-red w-100-perc h-100-perc text-centre"></p>
          <ul>
            <li>Not inspected (see 'Important note' below)/</li>
          </ul>
          <p className="w-100-perc h-100-perc text-centre"><strong>NI</strong></p>
        </TableBlock>
        <p></p>
        <div className="italic">
          <p>Important Note:</p>
          <p className="m-0">We carry out a desk-top study and make oral enquiries for information about matters affecting the property.</p>
          <p className="m-0">We carefully and thoroughly inspect the property using our best endeavours to see as much of it as is physically accessible. Where this is not possible an 
  explanation will be provided.</p>
          <p className="m-0">We visually inspect roofs, chimneys and other surfaces on the outside of the building from ground level and, if necessary, from neighbouring public property 
  and with the help of binoculars.</p>
          <p className="m-0">Flat roofs no more than 3m above ground level are inspected using a ladder where it is safe to do so.</p>
          <p className="m-0">We inspect the roof structure from inside the roof space if there is safe access. We examine floor surfaces and under-floor spaces so far as there is safe access 
  and permission from the owner.</p>
          <p className="m-0">We are not able to assess the condition of the inside of any chimney, boiler or other flues.</p>
          <p className="m-0">We do not lift fitted carpets or coverings without the owner's consent. Intermittent faults of services may not be apparent on the day of inspection. If we are 
  concerned about parts of the property that the inspection cannot cover, the report will tell you about any further investigations that are needed.</p>
          <p className="m-0">Where practicable and agreed we report on the cost of any work for identified repairs and make recommendations on how these repairs should be carried out. </p>
          <p className="m-0">Some maintenance and repairs we suggest may be expensive. Purely cosmetic and minor maintenance defects that do not affect performance might not be 
  reported. The report that we provide is not a warranty.</p>
      </div>  
      </Page>
      <Page>
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
        <H2>Orientation</H2>
        <P>For purpose of this report, we have assumed that the front elevation faces Lees Street, with front, left, right and rear referred to accordingly as though 
facing the element in question.</P>
        <H2>Situation</H2>
        <P>The property is situated in Openshaw, a suburb located approximately 3.5 miles east of Manchester city centre.</P>
      </Page>
      <Page>
        <H2>Location Plan</H2>
        <p>Redline demarcations do not represent the legal boundary of the property and are for indicative purposes only.</p>
        <img></img>
      </Page>
      <Page>
        <H2>Typical House Diagram</H2>
        <img></img>
      </Page>
      <Page>
        <H1>Description Of the Property</H1>
        <P></P>
      </Page>
      <Page>
        {form.conditionSections.map((cs, i) => <ConditionSection key={i} conditionSection={cs} />)}
      </Page>
    </TocContext.Provider>
  );
};


type ConditionSectionProps = {
    key: number,
    conditionSection: ConditionSection
}

const ConditionSection = ({ conditionSection }: ConditionSectionProps) => {
  const cs = conditionSection;

  if(!cs.isPartOfSurvey)
    return <></>;

  const images = getImagesFromFileList(cs.images);

  let tableRows = [];
  for(let i = 0; i < images.length; i = i + 2) {
    tableRows.push(
      <tr>
        <td><img key={i} src={images[i]} width={200} /></td>
        {images.length >= i + 1 && <td><img key={i + 1} src={images[i + 1]} width={200} /></td>}
      </tr>
    )
  }

  return (
    <>
      <h2>{cs.name}</h2>
      <div className="grid grid-cols-2 gap-4">
        <p><strong className="text-red-500">Description:</strong></p>
        <p>{cs.description}</p>
        <p><strong>Defects:</strong></p>
          {cs.defects?.map((d, i) => {
            return (
              <p>{d.name}&nbsp;<strong>{d.cost}</strong></p>
            )
          })}
      </div>
        <table style={{width: "100%"}}>
          <tbody>
            {tableRows}
          </tbody>
        </table>
    </>
  );
}