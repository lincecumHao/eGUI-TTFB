define(['N/url', 'N/https', '../gw_download_pdf/gw_api_client'], function (
  url,
  https,
  GwApiClient
) {
  /**
   * Module Description...
   *
   * @exports XXX
   *
   * @copyright 2020 gateweb
   * @author Sean Lin <seanlin816@gmail.com>
   *
   * @NApiVersion 2.1
   * @NModuleScope Public
   * @NScriptType ClientScript
   */
  var exports = {}

  /**
   * pageInit event handler; executed when the page completes loading or when the form is reset.
   *
   * @gov XXX
   *
   * @param {Object} context
   * @param {string} context.mode - The access mode of the current record.
   * @param {CurrentRecord} context.currentRecord - The record in context
   */
  function pageInit(context) {
    // TODO
  }

  function downloadPdfClicked() {
    var xmlFileObjects = getXmlTestData()
    try {
      GwApiClient.downloadPdfs(xmlFileObjects)
    } catch (e) {
      console.log('error', e)
    }
  }

  function printToPrinterClicked() {
    var xmlFileObjects = getXmlTestData()
    console.log('printToPrinterClicked modified')
    try {
      console.log('call GwWebApiClient')
      GwApiClient.printToPrinter(xmlFileObjects)
    } catch (e) {
      console.log('error', e)
    }
  }

  function getXmlTestData() {
    var xmlString =
      '<?xml version="1.0" encoding="UTF-8"?><Invoice xmlns="urn:GEINV:eInvoiceMessage:C0401:3.1"><Main><InvoiceNumber>ZZ10094357</InvoiceNumber><InvoiceDate>20200826</InvoiceDate><InvoiceTime>10:31:11</InvoiceTime><Seller><Identifier>24549210</Identifier><Name>GateWeb Information Co., Ltd. (Development Account 0)</Name><Address>GateWeb Information Co., Ltd. (Development Account 0)</Address><PersonInCharge/><TelephoneNumber/><FacsimileNumber/><EmailAddress/></Seller><Buyer><Identifier>99999997</Identifier><Name>11 se06_company公司</Name><Address>台北市松山區敦化北路199號 Taiwan</Address><PersonInCharge/><TelephoneNumber/><FacsimileNumber/><EmailAddress/></Buyer><MainRemark/><CustomsClearanceMark/><RelateNumber>4352</RelateNumber><InvoiceType>07</InvoiceType><DonateMark>0</DonateMark><CarrierType/><CarrierId1/><CarrierId2/><PrintMark>Y</PrintMark><NPOBAN/><RandomNumber>1234</RandomNumber></Main><Details><ProductItem><Description>SONY電視機</Description><Quantity>10</Quantity><Unit>unit</Unit><UnitPrice>3143</UnitPrice><Amount>31429</Amount><SequenceNumber>1</SequenceNumber><Remark/></ProductItem><ProductItem><Description>新客戶折扣</Description><Quantity>1</Quantity><Unit>unit</Unit><UnitPrice>840</UnitPrice><Amount>-840</Amount><SequenceNumber>2</SequenceNumber><Remark/></ProductItem></Details><Amount><SalesAmount>30589</SalesAmount><FreeTaxSalesAmount>0</FreeTaxSalesAmount><ZeroTaxSalesAmount>0</ZeroTaxSalesAmount><TaxType>1</TaxType><TaxRate>0.00</TaxRate><TaxAmount>1529</TaxAmount><TotalAmount>32118</TotalAmount></Amount></Invoice>'
    var xmlFileObjects = []
    xmlFileObjects.push({
      filename: 'C0401-ZZ10094351-948.xml',
      xml: xmlString,
      docType: GwApiClient.DOCTYPE.INVOICE,
      reprint: false,
      documentStatus: GwApiClient.DOCSTATUS.issue,
      extramemo: 'test 1 123|test2 234',
    })
    xmlFileObjects.push({
      filename: 'C0401-ZZ10094351-949.xml',
      xml: xmlString,
      docType: GwApiClient.DOCTYPE.INVOICE,
      reprint: false,
      documentStatus: GwApiClient.DOCSTATUS.issue,
      extramemo:
        '日期 病患姓名 數量|2020/08/15 連玉美 3|2020/08/15 黃冠惟 3|2020/08/15 楊若馨 6|2020/08/15 田敏敏 2|2020/08/15 陳素華 2|2020/08/17 丁金汀 2|2020/08/17 陳曾桂枝 6|2020/08/19 陳中和 2|2020/08/19 洪王玉梅 2|2020/08/19 蓋支珍 3|2020/08/19 王智蔚 3|2020/08/19 莊錦坤 3|2020/08/19 劉續青 1|2020/08/25 鄭秀儀 6|2020/08/25 包效禹 6|2020/08/25 郭琯紫 3|2020/08/26 郭玉燕 4|2020/08/26 吳秀英 2|2020/08/26 鍾劉玉寶 7|2020/08/26 許文蓉 2|2020/08/26 季康淳 3|2020/08/26 范召葦 6|2020/08/26 陳永康 3|Total 80|',
    })
    xmlFileObjects.push({
      filename: 'C0401-ZZ10094351-950.xml',
      xml: xmlString,
      docType: GwApiClient.DOCTYPE.INVOICE,
      reprint: false,
      documentStatus: GwApiClient.DOCSTATUS.issue,
    })
    return xmlFileObjects
  }

  exports.pageInit = pageInit
  exports.downloadPdfClicked = downloadPdfClicked
  exports.printToPrinterClicked = printToPrinterClicked
  return exports
})
