define([
  'N/runtime',
  'N/file',
  'N/render',
  'N/email',
  'N/encode',
  '../../../library/ramda.min',
  '../../../gw_dao/voucher/gw_dao_voucher',
  '../gw_egui_service',
  '../../../gw_library/gw_api/gw_api'
], (
  runtime,
  file,
  render,
  email,
  encode,
  ramda,
  gwVoucherDao,
  eguiService,
  GwApi
) => {
  /**
   * Module Description...
   *
   * @type {Object} module-name
   *
   * @copyright 2021 Gateweb
   * @author Sean Lin <sean.hyl@gmail.com>
   *
   * @NApiVersion 2.1
   * @NModuleScope Public

   */
  var debuggerPath = 'SuiteApps/com.gateweb.gwegui/gw_issue_egui/services/email'

  function isInDebuggerMode() {
    return runtime.executionContext === runtime.ContextType.DEBUGGER
  }

  function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  function getHtmlTemplateFile() {
    var filename = 'eguiEmailTemplate.ftl'
    return isInDebuggerMode() ? `${debuggerPath}/${filename}` : `./${filename}`
  }

  function updateEguiObj(eguiObj) {
    var eguiObjClone = JSON.parse(JSON.stringify(eguiObj))
    eguiObjClone.lines = ramda.map((line) => {
      // line.unitPrice = Math.round(parseInt(line.unitPrice))
      line.salesAmt = Math.round(parseInt(line.salesAmt))
      return line
    }, eguiObjClone.lines)
    return eguiObjClone
  }

  function isNullOrEmpty(input) {
    if (typeof input === 'undefined' || input == null) return true
    return input.replace(/\s/g, '').length < 1
  }

  function isB2B(taxId) {
    return !isNullOrEmpty(taxId) && taxId !== '0000000000'
  }

  class EmailService {
    getEmailBody(eguiObj) {
      var htmlTemplateFile = file.load({
        id: getHtmlTemplateFile()
      })
      var htmlRenderer = render.create()
      htmlRenderer.templateContent = htmlTemplateFile.getContents()
      htmlRenderer.addCustomDataSource({
        format: render.DataSource.OBJECT,
        alias: 'guiData',
        data: eguiObj
      })
      return htmlRenderer.renderAsString()
    }

    sendByVoucherId(subject, voucherId) {
      log.audit({title: 'sendByVoucherId', details: 'start...'})
      log.audit({title: 'sendByVoucherId - subject|voucherId', details: subject + '|' + voucherId})
      var eguiObj = gwVoucherDao.getGuiByVoucherId(voucherId)
      var eguiObjUpdated = updateEguiObj(eguiObj)
      if(this.getAuthor(eguiObjUpdated)) {
        var emailContentObj = {
          author: this.getAuthor(eguiObjUpdated),
          body: this.getEmailContent(eguiObjUpdated),
          recipients: this.getRecipients(eguiObjUpdated),
          subject: this.getSubject(subject, eguiObjUpdated)
        }

        log.debug({ title: 'isB2B', details: isB2B(eguiObjUpdated.buyerTaxId) })
        log.debug({ title: 'buyerTaxId', details: eguiObjUpdated.buyerTaxId })
        if (isB2B(eguiObjUpdated.buyerTaxId)) {
          emailContentObj.attachments = this.getAttachmentFiles(eguiObjUpdated)
        }
        return this.send(subject, emailContentObj)
      } else {
        log.audit({title: 'in sendByVoucherId func', details: 'do not send email because author is missing'})
      }
    }

    send(subject, emailContentObj) {
      return email.send(emailContentObj)
    }

    getEmailContent(eguiObj) {
      return this.getEmailBody(eguiObj)
    }

    getAuthor(eguiObj) {
      return eguiObj.sellerProfile.contactEmployee.value
    }

    getRecipients(eguiObj) {
      var recipients = []
      var recipient = eguiObj.buyerEmail || 'jackielin@gateweb.com.tw'
      recipients.push(recipient)
      return recipients
    }

    getSubject(subject, eguiObjUpdated) {
      return `${subject} - ${eguiObjUpdated.documentNumber}`
    }

    getAttachmentFiles(eguiObj) {
      var attachments = []
      var fileContent = this.getEguiPdf(eguiObj)
      var filenameParts = eguiObj.uploadXmlFileName.split('-') //0:C0401, 1:eguiNumber, 2: timestamp
      var filename = ''
      var pdfAttachment = file.create({
        name: eguiObj.uploadXmlFileName.replace('.xml', '') + '.pdf',
        fileType: file.Type.PDF,
        contents: fileContent
      })
      attachments.push(pdfAttachment)

      return attachments
    }

    getEguiPdf(eguiObj) {
      var xmlString = eguiService.genXml(eguiObj)
      var pdfParams = {
        filename: eguiObj.uploadXmlFileName,
        xml: xmlString,
        docType: 'invoice',
        docStatus: 2,
        uploadDocument: eguiObj.needUploadMig,
        reprint: false
      }
      var pdfResponse = GwApi.downloadEGuiPdf(pdfParams)
      return pdfResponse.body
    }
  }

  return new EmailService()
})
