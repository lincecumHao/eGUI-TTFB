define([
  'N/record',
  'N/format',
  '../library/moment-with-locales',
  './mapper/gw_ap_doc_mapper',
  '../validator/gw_ap_validator',
  './gw_ap_doc_record_fields',
  '../../gw_dao/docFormat/gw_dao_doc_format_21'
], (record, format, moment, apDocMapper, ApDocValidator, recordFields, docTypeDao) => {
  /**
   * Module Description...
   *
   * @type {Object} module-name
   *
   * @copyright 2022 Gateweb
   * @author Sean Lin <seanlin@gateweb.com.tw>
   *
   * @NApiVersion 2.1
   * @NModuleScope Public

   */

  const recordTypeId = 'customrecord_gw_ap_doc'

  class ApDocService {
    convertApDocToRecordObj(apDocObj) {
      const mapper = new apDocMapper(apDocObj)
      return mapper.convertApDocToRecordObj()
    }

    convertRestletRequestToApDocObj(requestObj) {
      let apDocObj = JSON.parse(JSON.stringify(requestObj))
      if (apDocObj.docTypeId) {
        const docType = docTypeDao.getById(apDocObj.docTypeId)
        apDocObj.docType = docType.value.toString()
      }
      else {
        const docType = docTypeDao.getByValue(apDocObj.docType)
        apDocObj.docTypeId = docType.id
      }

      return apDocObj
    }

    validateApDoc(apDocObj, responseObj) {
      const apDocValidator = new ApDocValidator(apDocObj)
      responseObj = apDocValidator.validate()
      return responseObj
    }

    insertRecord(apDocRecordObj) {
      var newRecord = record.create({
        type: recordTypeId,
        isDynamic: true
      })
      Object.keys(apDocRecordObj).forEach(function (fieldId) {
        if (fieldId !== 'lines') {
          var fieldValue = apDocRecordObj[fieldId]
          var fieldObj = recordFields.getFieldById(fieldId)
          if (fieldObj.dataType && fieldObj.dataType === 'int') {
            fieldValue = Math.round(fieldValue)
          }
          if (fieldObj.dataType === 'date') {
            fieldValue = convertDate(fieldValue)
          }
          if (fieldObj.dataType === 'list') {
              newRecord.setText({
                  fieldId: fieldId,
                  text: fieldValue
              })
          } else {
              newRecord.setValue({
                  fieldId: fieldId,
                  value: fieldValue
              })
          }
        }
      })
      return newRecord.save()
    }
  }

  const convertDate = (dateValue) => {
    return dateValue ? new Date(moment(dateValue).format('YYYY/MM/DD')) : ''
  }
  return ApDocService
})
