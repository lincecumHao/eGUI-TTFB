/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define([
  'N/search',
  'N/currentRecord',
  'N/record',
  'N/ui/dialog',
  'N/url',
  '../../gw_print/gw_download_pdf/gw_api_client',
  '../gw_common_utility/gw_common_configure',
  '../gw_common_utility/gw_common_date_utility',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_migxml_utility',
  '../gw_common_utility/gw_common_gwmessage_utility',
], function (
  search,
  currentRecord,
  record,
  dialog,
  url,
  gwapiclient,
  gwconfigure,
  dateutility,
  stringutility,
  migxmlutility,
  gwmessage
) {
  var _voucher_main_record = gwconfigure.getGwVoucherMainRecord()

  var _currentRecord = currentRecord.get()

  function fieldChanged(context) {
    if (window.onbeforeunload) {
      //avoid change warning
      window.onbeforeunload = function () {
        null
      }
    }

    var _changeFieldId = context.fieldId
    console.log('_changeFieldId=' + _changeFieldId)
  }

  function sublistChanged(context) {
    var changedSubListId = context.sublistId
    console.log('changedSubListId=' + changedSubListId)
    //alert('changedSubListId='+changedSubListId);
    var changeLineId = _currentRecord.getCurrentSublistIndex({
      sublistId: changedSubListId,
    })
    console.log('changeLineId=' + changeLineId)
  }

  /////////////////////////////////////////////////////////////////////////////////////////
  //Gen XML Function-Start
  function printPDFSelected(voucher_type) {
    try {
      var voucher_list_id = _currentRecord.getValue({
        fieldId: 'custpage_voucher_hiddent_listid',
      })
      if (voucher_list_id == '') {
        var _pre_text = '電子發票'
        if (voucher_type == 'EGUI') {
          _pre_text = '電子發票'
        } else if (voucher_type == 'ALLOWANCE') {
          _pre_text = '折讓(電子發票)'
        }

        var _title = _pre_text + '-下載PDF管理'
        var _message = '請選取' + _pre_text + '-下載PDF資料'

        gwmessage.showErrorMessage(_title, _message)
        return
      } else {
        //Disabled Button
        document.getElementById('custpage_print_pdf_button').disabled = true
      }

      var _b2bs_xml = _currentRecord.getValue({
        fieldId: 'custpage_b2bs_xml_field',
      })
      var _b2be_xml = _currentRecord.getValue({
        fieldId: 'custpage_b2be_xml_field',
      })
      var _b2c_xml = _currentRecord.getValue({
        fieldId: 'custpage_b2c_xml_field',
      })

      var _genxml_toftp_result = 'Y'
      var _genxml_toftp_message = ''

      //20201110 walter modify access_model = [GATEWEB, NETSUITE]
      var _access_model = migxmlutility.getConfigureValue(
        'ACCESS_MODEL',
        'XML_MODEL'
      )
      console.log('access_model', _access_model)
      var _xmlObjectAry = migxmlutility.getVoucherToDoList(
        _access_model,
        voucher_type,
        voucher_list_id,
        _b2bs_xml,
        _b2be_xml,
        _b2c_xml,
        _genxml_toftp_result,
        _genxml_toftp_message
      )

      var _xmlFileObjects = []
      var _doc_type = ''
      if (voucher_type == 'EGUI') {
        _doc_type = gwapiclient.DOCTYPE.INVOICE
      } else {
        _doc_type = gwapiclient.DOCTYPE.ALLOWANCE
      }

      if (_xmlObjectAry != null) {
        for (var i = 0; i < _xmlObjectAry.length; i++) {
          var _obj = _xmlObjectAry[i]

          var _apply_id = _obj.apply_id
          var _xml = _obj.mig_xml
          var _file_name = _obj.file_name
          var _is_printed = _obj.is_printed //Paper
          var _data_type = _obj.data_type //2:開立 , 3:作廢

          var _reprint = _obj.is_printed
          var _reprint_pdf = _obj.is_printed_pdf
          var _reprint_paper = _obj.is_printed_paper
          //var _extra_memo    = _obj.extra_memo;
          var _extra_memo = removeChangeLineChar(_obj.extra_memo)
          //20201102 walter modify (NONE)
          var _need_upload_egui_mig = _obj.need_upload_egui_mig

          //documentStatus ==> 2: Issue[開立], 3: cancel[作廢], 4: void[註銷], 5: reject
          var _document_status = ''
          if (_data_type == '2') {
            _document_status = gwapiclient.DOCSTATUS.issue
            //_document_status=_data_type; //for test
          } else if (_data_type == '3') {
            _document_status = gwapiclient.DOCSTATUS.cancel
            //_document_status=_data_type; //for test
          }
          //alert('gwapiclient.DOCSTATUS.ISSUE='+gwapiclient.DOCSTATUS.issue+' ,gwapiclient.DOCSTATUS.CANCEL='+gwapiclient.DOCSTATUS.cancel);
          console.log('_doc_type', _doc_type)
          console.log('_document_status', _document_status)
          console.log('_file_name', _file_name)
          console.log('_xml', _xml)
          console.log('_reprint', _reprint)
          console.log('_extra_memo', _extra_memo)
          console.log('_need_upload_egui_mig', _need_upload_egui_mig)

          ///////////////////////////////////////////////////////////////////////////////////////
          var _need_upload_egui_status = true
          if (_need_upload_egui_mig == 'NONE') _need_upload_egui_status = false

          _xmlFileObjects.push({
            filename: _file_name + '.xml',
            xml: _xml,
            docType: _doc_type,
            docStatus: _document_status,
            extramemo: _extra_memo,
            uploadDocument: _need_upload_egui_status,
            reprint: _reprint,
          })
          ///////////////////////////////////////////////////////////////////////////////////////
          //Update MAIN print pdf flag is true _apply_id
          console.log('Pass xmlFileObjects=>' + JSON.stringify(_xmlFileObjects))
          //alert('_data_type='+_data_type+' ,document_status='+_document_status);
          try {
            var values = {}
            values['custrecord_gw_is_printed_pdf'] = true
            if (_reprint_pdf == false) {
              var _id = record.submitFields({
                type: _voucher_main_record,
                id: parseInt(_apply_id),
                values: values,
                options: {
                  enableSourcing: false,
                  ignoreMandatoryFields: true
                }
              })
            }
          } catch (e) {
            console.log(e.name + ':' + e.message)
          }

          ///////////////////////////////////////////////////////////////////////////////////////
        }
      }

      try {
          gwapiclient.downloadPdfs(_xmlFileObjects)
      } catch (e) {
        console.log('error', e)
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }

    document.forms[0].submit()
  }

  function removeChangeLineChar(text) {
    console.log('removeChangeLineChar', text)
    if (text) {
      while (text.indexOf('\r') > -1) {
        text = text.replace('\r', '')
      }
      while (text.indexOf('\n') > -1) {
        text = text.replace('\n', '')
      }
    }
    return text
  }

  //Gen XML Function-End
  /////////////////////////////////////////////////////////////////////////////////////////
  //重傳作業
  var voucher_internal_id = -1

  function reApplyVoucherTask(internal_id) {
    try {
      var options = {
        title: '憑證管理',
        message: '是否重傳憑證',
      }

      voucher_internal_id = internal_id

      dialog.confirm(options).then(successTask).catch(failureTask)
    } catch (e) {
      log.debug(e.name, e.message)
    }
  }
   
  function searchBusinessName(businessNo) {
    var _companyObj
    try {
		 var _businessSearch = search
				  .create({
					type: 'customrecord_gw_business_entity',
					columns: ['custrecord_gw_be_tax_id_number', 'custrecord_gw_be_gui_title', 'custrecord_gw_be_business_address', 'custrecord_gw_be_contact_email'],
					filters: ['custrecord_gw_be_tax_id_number', 'is', businessNo]
				  })
				  .run()
				  .each(function (result) {
					var _internalid = result.id

					var _tax_id_number = result.getValue({
					  name: 'custrecord_gw_be_tax_id_number',
					})
					var _be_gui_title = result.getValue({
					  name: 'custrecord_gw_be_gui_title',
					})
					var _business_address = result.getValue({
					  name: 'custrecord_gw_be_business_address',
					})
					var _contact_email = result.getValue({
					  name: 'custrecord_gw_be_contact_email',
					})
					
					_companyObj = {
						'tax_id_number':_tax_id_number,
						'be_gui_title':_be_gui_title,
						'business_address':_business_address,
						'contact_email':_contact_email
					}
 
					return true
				  }) 
	  
       
    } catch (e) {
      log.error(e.name, e.message)
    }

    return _companyObj.be_gui_title
  }

  function failureTask(reason) {
    console.log('cancel this task=>' + reason)
  }

  function successTask(reason) {
    if (reason == false || voucher_internal_id == -1) return

    document.getElementById('custpage_voucher_reapply_button').disabled = true

    //EGUI or ALLOWANCE
    var _voucher_type = _currentRecord.getValue({
      fieldId: 'custpage_voucher_type',
    })

    try {
      //1.取得資料
      //1.1.抓主檔
      //_voucher_status = {VOUCHER_ERROR, CANCEL_ERROR}
      var _voucher_status = _currentRecord.getValue({
        fieldId: 'custpage_gw_voucher_status',
      })

      var _values = {}
      if (_voucher_type == 'EGUI') {
        var _buyer_name = _currentRecord.getValue({
          fieldId: 'custpage_buyer_name',
        })
        var _buyer_email = _currentRecord.getValue({
          fieldId: 'custpage_buyer_email',
        })
        var _buyer_address = _currentRecord.getValue({
          fieldId: 'custpage_buyer_address',
        })
        var _carrier_type = _currentRecord.getValue({
          fieldId: 'custpage_carrier_type',
        })
        var _carrier_id_1 = _currentRecord.getValue({
          fieldId: 'custpage_carrier_id_1',
        })
        var _carrier_id_2 = _currentRecord.getValue({
          fieldId: 'custpage_carrier_id_2',
        })
        var _npo_ban = _currentRecord.getValue({ fieldId: 'custpage_npo_ban' })
        var _main_remark = _currentRecord.getValue({
          fieldId: 'custpage_main_remark',
        })
        ////////////////////////////////////////////////////////////////////////////////////////
        _values['custrecord_gw_buyer_name'] = _buyer_name
        _values['custrecord_gw_buyer_email'] = _buyer_email
        _values['custrecord_gw_buyer_address'] = _buyer_address
        _values['custrecord_gw_carrier_type'] = _carrier_type
        _values['custrecord_gw_carrierid1'] = _carrier_id_1
        _values['custrecord_gw_carrierid2'] = _carrier_id_2
        _values['custrecord_gw_npoban'] = _npo_ban
        _values['custrecord_gw_main_remark'] = _main_remark
      } else {
        //折讓單=>不處理任何資料只做重傳
    	//重抓公司名稱
    	var _hide_company_ban = _currentRecord.getValue({fieldId: 'custpage_hide_company_ban'})    	  
    	_values['custrecord_gw_seller_name'] = searchBusinessName(_hide_company_ban)  
      }
      if (_voucher_status.indexOf('VOUCHER') != -1) {
        //開立
        _values['custrecord_gw_voucher_status'] = 'VOUCHER_SUCCESS'
      } else {
        //作廢
        _values['custrecord_gw_voucher_status'] = 'CANCEL_APPROVE'
      }
      _values['custrecord_gw_need_upload_egui_mig'] = _voucher_type
      _values['custrecord_gw_voucher_upload_status'] = 'A'
      //錯誤訊息清空
      _values['custrecord_gw_uploadstatus_messag'] = ''

      record.submitFields({
        type: 'customrecord_gw_voucher_main',
        id: voucher_internal_id,
        values: _values,
        options: {
          enableSourcing: false,
          ignoreMandatoryFields: true,
        },
      })
      ////////////////////////////////////////////////////////////////////////////////////////
      //1.2.抓明細檔
      if (_voucher_type == 'EGUI') {
        var _invoice_item_count = _currentRecord.getLineCount({
          sublistId: 'invoicesublistid',
        })
        if (
          typeof _invoice_item_count !== 'undefined' &&
          _invoice_item_count > 0
        ) {
          for (var i = 0; i < _invoice_item_count; i++) {
            //Item 的Internal id
            var _item_internal_id = _currentRecord.getSublistValue({
              sublistId: 'invoicesublistid',
              fieldId: 'customer_search_internal_id',
              line: i,
            })
            var _item_remark = _currentRecord.getSublistValue({
              sublistId: 'invoicesublistid',
              fieldId: 'custpage_item_remark',
              line: i,
            })
			var _item_unit = _currentRecord.getSublistValue({
              sublistId: 'invoicesublistid',
              fieldId: 'custpage_invoice_item_unit',
              line: i,
            })

            var _item_values = {}
            _item_values['custrecord_gw_item_remark'] = _item_remark
			_item_values['custrecord_gw_item_unit'] = _item_unit
            record.submitFields({
              type: 'customrecord_gw_voucher_details',
              id: _item_internal_id,
              values: _item_values,
              options: {
                enableSourcing: false,
                ignoreMandatoryFields: true,
              },
            })
          }
        }
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
    var _params = {
      voucher_type: _voucher_type,
      voucher_internal_id: voucher_internal_id,
    }
    if (_voucher_type == 'EGUI') {
      window.location = url.resolveScript({
        scriptId: 'customscript_gw_egui_ui_view',
        deploymentId: 'customdeploy_gw_egui_ui_view',
        params: _params,
        returnExternalUrl: false,
      })
    } else {
      window.location = url.resolveScript({
        scriptId: 'customscript_gw_allowance_ui_view',
        deploymentId: 'customdeploy_gw_allowance_ui_view',
        params: _params,
        returnExternalUrl: false,
      })
    }
  }

  /////////////////////////////////////////////////////////////////////////////////
  function pageInit() {
    try {
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  return {
    pageInit: pageInit,
    fieldChanged: fieldChanged,
    sublistChanged: sublistChanged,
    printPDFSelected: printPDFSelected,
    reApplyVoucherTask: reApplyVoucherTask,
  }
})
