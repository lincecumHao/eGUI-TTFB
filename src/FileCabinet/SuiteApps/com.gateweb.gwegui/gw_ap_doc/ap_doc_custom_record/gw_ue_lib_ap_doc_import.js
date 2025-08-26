/**
 * @NApiVersion 2.1
 * @NModuleScope Public
 */
define([
    'N/search',
    'N/url',
    'N/https',
    'N/record',
    '../vo/gw_ap_doc_fields'
  ],
  (
    search,
    url,
    https,
    record,
    apDocFields
  ) => {

    function afterSubmitProcess(scriptContext) {
      log.audit({ title: 'afterSubmitProcess - start', details: scriptContext })
      let guiData = setGUI(scriptContext.newRecord)
      let responseData = callCreateApi(guiData)

      updateApDocImport(scriptContext, responseData)
    }

    function setGUI(saveData) {
      const fields = apDocFields.fields
      const reFieldName = {
        applyPeriod: 'docIssuePeriod',
        applyPeriodSelect: 'taxFilingPeriod',
        TaxType:'taxType',
        ConsolidationMark: 'consolidationMark'
      }
      const isNumber =
          ['docType', 'salesAmt', 'zeroTaxSalesAmt', 'taxExemptedSalesAmt', 'taxAmt', 'totalAmt', 'consolidationQty']
      const isBln = ['filingSalesTax']
      let guiData = [{
        'action': 'validation&CreateVoucher',
        'GUIs': [{}]
      }]

      Object.keys(fields).forEach(key => {
        let fieldName = (!reFieldName[fields[key].name]) ? fields[key].name : reFieldName[fields[key].name]
        let fieldId = fields[key].id + '_i'
        let fieldValue = saveData.getValue(fieldId)
        if (isNumber.indexOf(fieldName) !== -1 && fieldValue.toString().length > 0) {
          fieldValue = parseFloat(fieldValue)
        }
        if (isBln.indexOf(fieldName) !== -1 && fieldValue.toString().length > 0) {
          log.debug({title: 'fieldName', details: fieldName})
          log.debug({title: 'fieldValue', details: fieldValue})
          fieldValue = (fieldValue.toLowerCase() === 'true' || fieldValue.toLowerCase() === 'yes')
        }
        guiData[0].GUIs[0][fieldName] = fieldValue
      })

      // guiData[0].GUIs[0]['transactionNo'] = saveData.getValue('custrecord_gw_apt_doc_tran_id_i')

      log.debug('setGUIs - guiData', guiData[0].GUIs[0])
      log.debug('setGUIs - guiData', guiData)
      return guiData
    }

    function callCreateApi(guiData) {
      const scriptId = 'customscript_gw_rl_ap_integration_entry'
      const deploymentId = 'customdeploy_gw_rl_ap_integration_entry'
      const headers = { "Content-Type": "application/json" }

      let responseData =  https.requestRestlet({
        scriptId,
        deploymentId,
        method: https.Method.POST,
        headers,
        body: JSON.stringify(guiData),
      })

      log.debug('callCreateApi - responseData', responseData.body)

      return responseData
    }

    function updateApDocImport(scriptContext, responseData) {
      // const recordType = scriptContext.newRecord.type
      // const recordId = scriptContext.newRecord.id
      const resultBody = JSON.parse(responseData.body)

      log.debug('updateApDocImport - result', responseData)

      let submitFieldsObject = {}

      if(responseData.code === 200) {
        // TODO - set ap voucher record id to the record
        log.debug({
          title: `updateApDocImport-guiNumber: ${resultBody[0].consolidateResult[0].guiNumber}, commonNumber: ${resultBody[0].consolidateResult[0].commonNumber}`,
          details: `set ap voucher record id back to the record, id: ${resultBody[0].consolidateResult[0].voucherRecordId}`})
        scriptContext.newRecord.setValue({fieldId: 'custrecord_gw_ap_doc_linked_ap_record', value: resultBody[0].consolidateResult[0].voucherRecordId})
      } else {
        throw {name: resultBody.error.code, message: resultBody.error.message}
        // submitFieldsObject['custrecordgw_ap_doc_error_msg_i'] = resultBody.error.message
      }

      // try {
      //   record.submitFields({
      //     type: recordType,
      //     id: recordId,
      //     values: submitFieldsObject,
      //     options: {
      //       enableSourcing: false,
      //       ignoreMandatoryFields: true
      //     }
      //   })
      //
      //   log.audit({ title: 'updateApDocImport - Record Updated', details: 'recordId = ' + recordId })
      // } catch (e) {
      //   log.error({
      //     title: 'updateApDocImport - error',
      //     details: 'recordId = ' + recordId + ', ' + e.message
      //   })
      // }
    }

    return {
      afterSubmitProcess: afterSubmitProcess
    }

  })
