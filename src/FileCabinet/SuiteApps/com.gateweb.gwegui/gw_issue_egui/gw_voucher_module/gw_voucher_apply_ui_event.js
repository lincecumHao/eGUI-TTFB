/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 * @NModuleScope Public
 */
define([
  'N/transaction',
  'N/ui/dialog',
  'N/search',
  'N/record',
  'N/currentRecord',
  'N/url',
  '../gw_common_utility/gw_common_configure',
  '../gw_common_utility/gw_common_gwmessage_utility',
], function (
  transaction,
  dialog,
  search,
  record,
  currentRecord,
  url,
  gwconfigure,
  gwmessage
) {
  var _currentRecord = currentRecord.get()
  var invoiceIdArray = [-1]

  var _voucher_apply_list_record = gwconfigure.getGwVoucherApplyListRecord()
  var _voucher_main_record = gwconfigure.getGwVoucherMainRecord()
  var _voucher_detail_record = gwconfigure.getGwVoucherDetailsRecord()
  var _invoce_control_field_id = gwconfigure.getInvoceControlFieldId()
  var _gw_voucher_properties = gwconfigure.getGwVoucherProperties() //設定檔

  function fieldChanged(context) {
    if (window.onbeforeunload) {
      //avoid change warning
      window.onbeforeunload = function () {
        null
      }
    }

    var _changeFieldId = context.fieldId
    console.log('_changeFieldId=' + _changeFieldId)
    if (_changeFieldId == 'custpage_status') {
    }
  }

  function sublistChanged(context) {
    var changedSubListId = context.sublistId
    console.log('changedSubListId=' + changedSubListId)
    var changeLineId = _currentRecord.getCurrentSublistIndex({
      sublistId: changedSubListId,
    })
    console.log('changeLineId=' + changeLineId)
    //invoicesublistid creditmemosublistid
    //處理 Invoice
    if (changedSubListId == 'vouchersublistid') {
      var _checkedResult = _currentRecord.getCurrentSublistValue({
        sublistId: changedSubListId,
        fieldId: 'customer_search_voucher_check_id',
      })
      var _selectCheckId = _currentRecord.getCurrentSublistValue({
        sublistId: changedSubListId,
        fieldId: 'customer_search_voucher_id',
      })
      console.log(
        'checkedResult=' + _checkedResult + ', selectCheckId=' + _selectCheckId
      )
      if (_checkedResult) {
        //add to array
        invoiceIdArray.push(_selectCheckId)
      } else {
        //remove from array
        for (var i = 0; i <= invoiceIdArray.length; i++) {
          if (invoiceIdArray[i] === _selectCheckId) {
            invoiceIdArray.splice(i, 1)
          }
        }
      }

      _currentRecord.setValue({
        fieldId: 'custpage_voucher_hiddent_listid',
        value: invoiceIdArray.toString(),
        ignoreFieldChange: true,
      })
    }
  }

  function searchResults() {
    _currentRecord.setValue({
      fieldId: 'custpage_hiddent_buttontype',
      value: 'search',
      ignoreFieldChange: true,
    })

    document.forms[0].submit()
  }

  //取得欄位值
  function getSublistColumnValue(sublistId, keyfieldId, fieldId, internalId) {
    console.log(
      'GetSublistColumnValue sublistId= ' +
        sublistId +
        ' , fieldId=' +
        fieldId +
        '  ,internalId=' +
        internalId
    )
    var _entityId = 0
    var _numLines = _currentRecord.getLineCount({
      sublistId: sublistId,
    })

    //customer_search_invoice_id
    for (var i = 0; i < _numLines; i++) {
      var _id = _currentRecord.getSublistValue({
        sublistId: sublistId,
        fieldId: keyfieldId,
        line: i,
      })

      if (_id === internalId) {
        _entityId = _currentRecord.getSublistValue({
          sublistId: sublistId,
          fieldId: fieldId,
          line: i,
        })
        break
      }
    }

    return _entityId
  }

  function submitSelected() {
    //TODO voiid
    document.forms[0].submit()
  }

  //放稅別資料
  var _taxObjAry = []

  function loadAllTaxInformation() {
    try {
      var _group_type = 'TAX_TYPE'
      var _mySearch = search.create({
        type: _gw_voucher_properties,
        columns: [
          search.createColumn({ name: 'custrecord_gw_voucher_property_id' }), //TAX_WITH_TAX
          search.createColumn({ name: 'custrecord_gw_voucher_property_value' }), //1
          search.createColumn({ name: 'custrecord_gw_voucher_property_note' }), //應稅
          search.createColumn({ name: 'custrecord_gw_netsuite_id_value' }), //8
          search.createColumn({ name: 'custrecord_gw_netsuite_id_text' }), //VAT_TW TAX 5%-TW
        ],
      })

      var _filterArray = []
      _filterArray.push(['custrecord_gw_voucher_group_type', 'is', _group_type])
      _mySearch.filterExpression = _filterArray
      _mySearch.run().each(function (result) {
        var internalid = result.id

        var _voucher_property_id = result.getValue({
          name: 'custrecord_gw_voucher_property_id',
        })
        var _voucher_property_value = result.getValue({
          name: 'custrecord_gw_voucher_property_value',
        })
        var _voucher_property_note = result.getValue({
          name: 'custrecord_gw_voucher_property_note',
        })
        var _netsuite_id_value = result.getValue({
          name: 'custrecord_gw_netsuite_id_value',
        })
        var _netsuite_id_text = result.getValue({
          name: 'custrecord_gw_netsuite_id_text',
        })

        var _obj = {
          voucher_property_id: _voucher_property_id,
          voucher_property_value: _voucher_property_value,
          voucher_property_note: _voucher_property_note,
          netsuite_id_value: _netsuite_id_value,
          netsuite_id_text: _netsuite_id_text,
        }

        _taxObjAry.push(_obj)
        return true
      })
    } catch (e) {
      log.debug(e.name, e.message)
    }
  }

  //取得稅別資料
  function getTaxInformation(netsuiteId) {
    var _taxObj
    try {
      if (_taxObjAry != null) {
        for (var i = 0; i < _taxObjAry.length; i++) {
          var _obj = JSON.parse(JSON.stringify(_taxObjAry[i]))

          if (_obj.netsuite_id_value == netsuiteId) {
            _taxObj = _obj
            break
          }
        }
      }
    } catch (e) {
      log.debug(e.name, e.message)
    }

    return _taxObj
  }

  var _pass_voucherflow_status = ''

  function submitApprove(voucherflowStatus) {
    try {
      _pass_voucherflow_status = voucherflowStatus

      var _status_note = ''
      if (voucherflowStatus == 'CANCEL_APPROVE') {
        //同意
        _status_note = '同意'
      } else if (voucherflowStatus == 'CANCEL_REJECT') {
        _status_note = '不同意'
      }

      //20201116 walter modify 增加確認Dialog
      var options = {
        title: '憑證管理',
        message: '是否確認執行-' + _status_note + '作業',
      }

      dialog.confirm(options).then(success).catch(failure)
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function success(reason) {
    try {
      if (reason == false) return

      var _voucher_hiddent_listid = _currentRecord.getValue({
        fieldId: 'custpage_voucher_hiddent_listid',
      })
      var _idsAry = _voucher_hiddent_listid.split(',')

      var _title = '憑證管理'
      var _message = '作廢憑證已進入排程作業'
      if (_idsAry.length <= 1) {
        _message = '請選取憑證'
        gwmessage.showErrorMessage(_title, _message)
      } else {
        var _params = {
          pass_voucherflow_status: _pass_voucherflow_status,
          voucher_hiddent_listid: _voucher_hiddent_listid,
        }
        window.location = url.resolveScript({
          scriptId: 'customscript_gw_voucher_apply_action',
          deploymentId: 'customdeploy_gw_voucher_apply_action',
          params: _params,
          returnExternalUrl: false,
        })
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function success_back(reason) {
    try {
      if (reason == false) return

      var _voucher_hiddent_listid = _currentRecord.getValue({
        fieldId: 'custpage_voucher_hiddent_listid',
      })
      var _idsAry = _voucher_hiddent_listid.split(',')

      var _title = '憑證管理'
      var _message = '作廢憑證已進入排程作業'
      if (_idsAry.length <= 1) {
        _message = '請選取憑證'
        gwmessage.showErrorMessage(_title, _message)
      } else {
        for (var i = 0; i < _idsAry.length; i++) {
          var _interalId = _idsAry[i]
          if (parseInt(_interalId) > 0) {
            var _record = record.load({
              type: _voucher_apply_list_record,
              id: parseInt(_interalId),
              isDynamic: true,
            })
            //取得原申請發票IDs (EGUI+Allowance)
            var _invoice_apply_list = _record.getValue({
              fieldId: 'custrecord_gw_invoice_apply_list',
            })
            var _creditmemo_apply_list = _record.getValue({
              fieldId: 'custrecord_gw_creditmemo_apply_list',
            })
            var _customerdeposit_apply_list = _record.getValue({
              fieldId: 'custrecord_gw_customerdeposit_apply_list',
            })

            //1:開立申請(VOUCHER_ISSUE),2:開立成功(VOUCHER_SUCCESS),
            //6:作廢申請(CANCEL_ISSUE) 7:作廢退回(CANCEL_REJECT) 9:作廢同意(CANCEL_APPROVE) 9:作廢成功(CANCEL_SUCCESS)
            _record.setValue({
              fieldId: 'custrecord_gw_voucher_flow_status',
              value: _pass_voucherflow_status,
            })
            _record.save()

            //還原資料
            if (_pass_voucherflow_status == 'CANCEL_REJECT') {
              //處理憑證
              //1:開立申請(VOUCHER_ISSUE),2:開立成功(VOUCHER_SUCCESS),
              //6:作廢申請(CANCEL_ISSUE) 7:作廢退回(CANCEL_REJECT) 9:作廢成功(CANCEL_SUCCESS)
              if (_invoice_apply_list != '') {
                saveVoucharMainRecordStatus(
                  _invoice_apply_list,
                  'C',
                  'VOUCHER_SUCCESS'
                )
              }
              if (_creditmemo_apply_list != '') {
                saveVoucharMainRecordStatus(
                  _creditmemo_apply_list,
                  'C',
                  'VOUCHER_SUCCESS'
                )
              }
              if (_customerdeposit_apply_list != '') {
                saveVoucharMainRecordStatus(
                  _customerdeposit_apply_list,
                  'C',
                  'VOUCHER_SUCCESS'
                )
              }
            } else {
              loadAllTaxInformation() //載入稅別資料

              //處理憑證 CANCEL_APPROVE
              //1:開立申請(VOUCHER_ISSUE),2:開立成功(VOUCHER_SUCCESS),
              //6:作廢申請(CANCEL_ISSUE) 7:作廢退回(CANCEL_REJECT) 9:作廢成功(CANCEL_SUCCESS)
              if (_invoice_apply_list != '') {
                saveVoucharMainRecordStatusAndUnLockTransaction(
                  'INVOICE',
                  _invoice_apply_list,
                  'A',
                  _pass_voucherflow_status
                )
              }
              if (_creditmemo_apply_list != '') {
                saveVoucharMainRecordStatusAndUnLockTransaction(
                  'CREDITMEMO',
                  _creditmemo_apply_list,
                  'A',
                  _pass_voucherflow_status
                )
              }
              if (_customerdeposit_apply_list != '') {
                saveVoucharMainRecordStatusAndUnLockTransaction(
                  'CUSTOMER_DEPOSIT',
                  _customerdeposit_apply_list,
                  'A',
                  _pass_voucherflow_status
                )
              }
            }
          }
        }

        gwmessage.showInformationMessage(_title, _message)

        document.forms[0].submit()
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  //Reject 回復原狀態
  function saveVoucharMainRecordStatus(
    voucher_apply_list,
    upload_status,
    voucher_status
  ) {
    try {
      var _idsAry = voucher_apply_list.split(',')
      for (var i = 0; i < _idsAry.length; i++) {
        var _internalId = parseInt(_idsAry[i])
        if (_internalId > 0) {
          var _record = record.load({
            type: _voucher_main_record,
            id: _internalId,
            isDynamic: true,
          })

          var _need_upload_egui_mig = _record.getValue({
            fieldId: 'custrecord_gw_need_upload_egui_mig',
          })
          var values = {}
          if (_need_upload_egui_mig == 'NONE') {
            upload_status = 'A'
          }
          values['custrecord_gw_voucher_status'] = voucher_status //VOUCHER_SUCCESS
          values['custrecord_gw_voucher_upload_status'] = upload_status
          var _id = record.submitFields({
            type: _voucher_main_record,
            id: _internalId,
            values: values,
            options: {
              enableSourcing: false,
              ignoreMandatoryFields: true,
            },
          })
        }
      }
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  //20201106 walter modify
  //voucher_type = INVOICE, CREDITMEMO, CUSTOMER_DEPOSIT
  function saveVoucharMainRecordStatusAndUnLockTransaction(
    voucher_type,
    voucher_apply_list,
    upload_status,
    voucher_status
  ) {
    try {
      var _gw_gui_num_start_field = 'custbody_gw_gui_num_start'
      var _gw_gui_num_end_field = 'custbody_gw_gui_num_end'
      var _gw_allowance_num_start_field = 'custbody_gw_allowance_num_start'
      var _gw_allowance_num_end_field = 'custbody_gw_allowance_num_end'

      var _idsAry = voucher_apply_list.split(',')
      //1.Update Status
      for (var i = 0; i < _idsAry.length; i++) {
        var _internalId = parseInt(_idsAry[i])
        if (_internalId > 0) {
          var _record = record.load({
            type: _voucher_main_record,
            id: parseInt(_internalId),
            isDynamic: true,
          })

          //EGUI / ALLOWANCE
          var _voucher_type = _record.getValue({
            fieldId: 'custrecord_gw_voucher_type',
          })
          //上否上傳(NONE=不上傳)
          var _need_upload_egui_mig = _record.getValue({
            fieldId: 'custrecord_gw_need_upload_egui_mig',
          })
          //折讓單才做
          if (_voucher_type == 'ALLOWANCE' && _need_upload_egui_mig == 'NONE') {
            upload_status = 'D'
            voucher_status = 'CANCEL_SUCCESS'
          }

          var values = {}
          values['custrecord_gw_voucher_upload_status'] = upload_status //upload_status=A
          //作廢成功(CANCEL_APPROVE)
          values['custrecord_gw_voucher_status'] = voucher_status
          var _id = record.submitFields({
            type: _voucher_main_record,
            id: _internalId,
            values: values,
            options: {
              enableSourcing: false,
              ignoreMandatoryFields: true,
            },
          })
        }
      }

      //////////////////////////////////////////////////////////////////////////////////
      //2.作廢憑證資料
      var _mySearch = search.create({
        type: _voucher_detail_record,
        columns: [
          search.createColumn({ name: 'custrecord_gw_ns_document_type' }),
          search.createColumn({
            name: 'custrecord_gw_voucher_main_internal_id',
          }),
          search.createColumn({
            name: 'custrecord_gw_original_gui_internal_id',
          }),
          search.createColumn({ name: 'custrecord_gw_dtl_voucher_type' }),
          search.createColumn({ name: 'custrecord_gw_ns_document_apply_id' }),
          search.createColumn({ name: 'custrecord_gw_dtl_item_tax_code' }),
          search.createColumn({ name: 'custrecord_gw_item_amount' }),
        ],
      })

      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_ns_document_type',
        search.Operator.IS,
        voucher_type,
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_main_internal_id',
        search.Operator.ANYOF,
        _idsAry,
      ])
      _mySearch.filterExpression = _filterArray

      _mySearch.run().each(function (result) {
        var _voucher_main_internal_id = result.getValue({
          name: 'custrecord_gw_voucher_main_internal_id',
        })
        var _dtl_voucher_type = result.getValue({
          name: 'custrecord_gw_dtl_voucher_type',
        })
        var _ns_document_type = result.getValue({
          name: 'custrecord_gw_ns_document_type',
        })
        var _ns_document_apply_id = result.getValue({
          name: 'custrecord_gw_ns_document_apply_id',
        })

        ///////////////////////////////////////////////////////////////////////////////////////////////////
        //折讓單返還發票金額
        if (_dtl_voucher_type == 'ALLOWANCE') {
          var _original_gui_internal_id = result.getValue({
            name: 'custrecord_gw_original_gui_internal_id',
          })
          var _ns_item_tax_code = result.getValue({
            name: 'custrecord_gw_dtl_item_tax_code',
          })
          var _item_amount = result.getValue({
            name: 'custrecord_gw_item_amount',
          })

          //抓稅別資料
          var _taxObj = getTaxInformation(_ns_item_tax_code)

          var _record = record.load({
            type: _voucher_main_record,
            id: parseInt(_original_gui_internal_id),
            isDynamic: true,
          })

          var _discount_count = _record.getValue({
            fieldId: 'custrecord_gw_discount_count',
          })
          var _discount_sales_amount = _record.getValue({
            fieldId: 'custrecord_gw_discount_sales_amount',
          })
          var _discount_free_amount = _record.getValue({
            fieldId: 'custrecord_gw_discount_free_amount',
          })
          var _discount_zero_amount = _record.getValue({
            fieldId: 'custrecord_gw_discount_zero_amount',
          })
          var _discount_amount = _record.getValue({
            fieldId: 'custrecord_gw_discount_amount',
          })

          if (typeof _taxObj !== 'undefined') {
            _discount_count = (parseInt(_discount_count) - 1).toString()
            if (_taxObj.voucher_property_value == '1') {
              //應稅
              _discount_sales_amount = _discount_sales_amount - _item_amount
            } else if (_taxObj.voucher_property_value == '2') {
              //零稅
              _discount_zero_amount = _discount_zero_amount - _item_amount
            } else if (_taxObj.voucher_property_value == '3') {
              //免稅
              _discount_free_amount = _discount_free_amount - _item_amount
            }
            _discount_amount = _discount_amount - _item_amount
          }

          var values = {}
          values['custrecord_gw_discount_count'] = _discount_count
          values['custrecord_gw_discount_sales_amount'] = _discount_sales_amount
          values['custrecord_gw_discount_free_amount'] = _discount_free_amount
          values['custrecord_gw_discount_zero_amount'] = _discount_zero_amount
          values['custrecord_gw_discount_amount'] = _discount_amount

          var _id = record.submitFields({
            type: _voucher_main_record,
            id: parseInt(_original_gui_internal_id),
            values: values,
            options: {
              enableSourcing: false,
              ignoreMandatoryFields: true,
            },
          })
        }
        ///////////////////////////////////////////////////////////////////////////////////////////////////

        //3.直接作廢 Transaction-Voided 單據
        var _unLockRecordTypeID = record.Type.INVOICE
        if (_ns_document_type == 'INVOICE') {
          _unLockRecordTypeID = record.Type.INVOICE
        } else if (_ns_document_type == 'CREDITMEMO') {
          _unLockRecordTypeID = record.Type.CREDIT_MEMO
        } else if (_ns_document_type == 'CUSTOMER_DEPOSIT') {
          _unLockRecordTypeID = record.Type.CUSTOMER_DEPOSIT
        }

        var voidSalesOrderId = transaction.void({
          type: _unLockRecordTypeID,
          id: parseInt(_ns_document_apply_id),
        })

        ///////////////////////////////////////////////////////////////////////////////////////////////////

        return true
      })
      //////////////////////////////////////////////////////////////////////////////////
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function mark(
    flag,
    select_sublistId,
    select_field_id,
    select_checked_field_id
  ) {
    try {
      invoiceIdArray = [-1]
      var _num_lines = _currentRecord.getLineCount({
        sublistId: select_sublistId,
      })
      if (_num_lines > 0) {
        for (var i = 0; i < _num_lines; i++) {
          var _id = _currentRecord.getSublistValue({
            sublistId: select_sublistId,
            fieldId: select_field_id,
            line: i,
          })

          var _flag_value = 'F'
          if (flag == true) {
            _flag_value = 'T'
          }

          _currentRecord.selectLine({
            sublistId: select_sublistId,
            line: i,
          })

          _currentRecord.setCurrentSublistValue({
            sublistId: select_sublistId,
            fieldId: select_checked_field_id,
            value: flag,
            ignoreFieldChange: true,
          })

          if (flag == true) invoiceIdArray.push(_id)
        }
      }

      _currentRecord.setValue({
        fieldId: 'custpage_voucher_hiddent_listid',
        value: invoiceIdArray.toString(),
        ignoreFieldChange: true,
      })
    } catch (e) {
      console.log(e.name + ':' + e.message)
    }
  }

  function pageInit() {}

  return {
    pageInit: pageInit,
    mark: mark,
    fieldChanged: fieldChanged,
    submitApprove: submitApprove,
    sublistChanged: sublistChanged,
    submitSelected: submitSelected,
    searchResults: searchResults,
  }
})
