import {PUBLIC_WEB_URL as SITE_URL} from "@/lib/site";
export function SiteStructuredData(){
 const data={"@context":"https://schema.org","@graph":[
  {"@type":"Organization","@id":`${SITE_URL}/#organisation`,name:"IlluminatED",alternateName:"illumed",url:SITE_URL,logo:{"@type":"ImageObject",url:`${SITE_URL}/favicon/web-app-manifest-512x512.png`}},
  {"@type":"WebSite","@id":`${SITE_URL}/#website`,name:"IlluminatED",alternateName:"illumed.co.uk",url:SITE_URL,inLanguage:"en-GB",publisher:{"@id":`${SITE_URL}/#organisation`}},
  {"@type":"WebApplication","@id":`${SITE_URL}/#platform`,name:"IlluminatED",url:SITE_URL,applicationCategory:"EducationalApplication",operatingSystem:"Web",inLanguage:"en-GB",description:"Primary and secondary lesson slides and question-and-answer practice, plus GCSE, A-Level, BTEC and T Level revision and educational games for ages 13+.",audience:[{"@type":"EducationalAudience",educationalRole:"student"},{"@type":"EducationalAudience",educationalRole:"teacher"}],publisher:{"@id":`${SITE_URL}/#organisation`}}
 ]};
 return <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(data).replace(/</g,"\\u003c")}}/>;
}
