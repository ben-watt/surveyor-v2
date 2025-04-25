import { BuildingSurveyFormData, mapAddress } from "@/app/home/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { formatDateWithSuffix } from "../../utils/dateFormatters";
import Image from "next/image";

interface HeaderFooterHtmlProps {
  editorData: BuildingSurveyFormData | undefined;
}

export const Footer = ({ editorData }: HeaderFooterHtmlProps) => {
  return (
    <div className="footer-container">
      <img
        className="footerImage object-contain"
        src="/rics-purple-logo.jpg"
        alt="RICS Logo"
        width="150"
        height="40"
        style={{ maxWidth: "200px", height: "auto" }}
      />
    </div>
  );
};

export const Header = ({ editorData }: HeaderFooterHtmlProps) => {
  return (
    <div className="header-container">
    <img
      className="absolute top-0 headerImage object-contain"
      src="/cwbc_header.jpg"
      alt="CWBC Header"
      width="550px"
    />
    <div className="headerAddress mt-2">
      <p className="text-xs text-gray-600">
        {editorData
          ? editorData.reportDetails.address.formatted
          : "Unknown"}
      </p>
      <p>{editorData ? "#" + editorData.id.substring(0, 8) : "Unknown"}</p>
      <p>
        {editorData
          ? formatDateWithSuffix(
              new Date(editorData.reportDetails.reportDate)
            )
          : "Unknown"}
      </p>
    </div>
  </div>
  )
}


export const TitlePage = ({ editorData }: HeaderFooterHtmlProps) => {
  return (
    <div className="title-page relative">
      <Image src="/cwbc_cover_landscape.jpg" alt="Cover Page" width={1122} height={0} />
      <div className="absolute text-white bottom-24 w-full">
        <div className="flex justify-between px-16 w-full min-h-40">
          <div>
            <p>Level {editorData?.reportDetails.level} Building Survey Report</p>
            {editorData?.reportDetails.address && mapAddress(editorData?.reportDetails.address, (line) => <p key={line}>{line}</p>)}
          </div>
          <div className="self-end text-right">
            <p>
                {editorData
                  ? formatDateWithSuffix(
                      new Date(editorData.reportDetails.reportDate)
                    )
                  : "Unknown"}
            </p>
            <p>{editorData ? "#" + editorData.id.substring(0, 8) : "Unknown"}</p>
          </div>
        </div>
      </div>   
  </div>
  )
}