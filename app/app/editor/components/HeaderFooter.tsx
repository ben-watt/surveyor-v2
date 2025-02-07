import { BuildingSurveyFormData } from "@/app/app/surveys/building-survey-reports/BuildingSurveyReportSchema";
import { formatDateWithSuffix } from "../../utils/dateFormatters";

interface HeaderFooterHtmlProps {
  editorData: BuildingSurveyFormData | undefined;
}

export const HeaderFooterHtml = ({ editorData }: HeaderFooterHtmlProps) => {
  return (
    <>
      <div className="header-container mb-4">      
        <img
          className="headerImage object-contain"
          src="/cwbc-logo.webp"
          alt="CWBC Logo"
          width="150"
          height="80"
          style={{ maxWidth: '300px', height: 'auto' }}
        /> 
         <div className="headerAddress mt-2">
          <p className="text-xs text-gray-600">
            {editorData ? editorData.reportDetails.address.formatted : "Unknown"}
          </p>
          <p>
            {editorData ? '#' + editorData.id.substring(0, 8) : "Unknown"}
          </p>
          <p>
            {editorData ? formatDateWithSuffix(new Date(editorData.reportDetails.reportDate)) : "Unknown"}
          </p>
        </div>
      </div>
      <div className="footer-container mt-4">
        <img
          className="footerImage object-contain"
          src="/rics-purple-logo.jpg"
          alt="RICS Logo"
          width="150"
          height="40"
          style={{ maxWidth: '200px', height: 'auto' }}
        />
      </div>
    </>
  );
}; 