/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */

define([
  'N/runtime',
  'N/ui/serverWidget',
  'N/redirect',
  'N/search',
  'N/format',
  'N/url',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_date_utility',
  '../gw_common_utility/gw_common_configure',
  '../gw_common_utility/gw_lib_sl_utility'
], function (
  runtime,
  serverWidget,
  redirect,
  search,
  format,
  url,
  stringutility,
  invoiceutility,
  dateutility,
  gwconfigure,
  gwLibSuiteLetUtility
) {
  var defaultAccount = gwconfigure.getGwInvoiceEditDefaultAccount()
  var _gwVoucherGenxmlScriptId = gwconfigure.getGwVoucherGenxmlScriptId()
  var _gwVoucherGenxmlDeployId = gwconfigure.getGwVoucherGenxmlDeploymentId()

  var _gw_voucher_main_search_id = gwconfigure.getGwVoucherMainSearchId()

  var _voucher_main_record = gwconfigure.getGwVoucherMainRecord()

  //憑證 Information View
  var _voucher_view_script_id = 'customscript_gw_allowance_ui_view'
  var _voucher_view_deploy_id = 'customdeploy_gw_allowance_ui_view'
	  
  //欄位寬度
  var _field_height = 80
  var _field_width = 150
  var _field_text_width = 20

  //報稅期別(取得今日)
  function getEffectYearMonth() {
    var _file_tax_return_year_month = ''

    var _today = dateutility.getCompanyLocatDate()

    var _tradition_date = (parseInt(_today, 10) - 19110000).toString()
    //tradition_date=1100915
    var _tradition_year = parseInt(_tradition_date.substr(0, 3), 10)
    var _month = parseInt(_tradition_date.substr(3, 2), 10)
    var _day = parseInt(_tradition_date.substr(5, 2), 10)

    if (_month % 2 != 0) {
      //處理單月
      if (_day <= 15) {
        if (_month == 1) {
          _tradition_year = _tradition_year - 1
          _month = 12
        } else {
          _month = _month - 1
        }
      } else {
        _month = _month + 1
      }
    }

    if (_month < 10)
      _file_tax_return_year_month = _tradition_year + '0' + _month
    else _file_tax_return_year_month = _tradition_year + '' + _month

    return _file_tax_return_year_month
  }

  function getSelectName(form, searchFieldId, entityId) {
    var _text = ''
    if (entityId !== '') {
      var _field = form.getField({
        id: searchFieldId,
      })
      var _options = _field.getSelectOptions({
        filter: entityId,
      })

      for (var i = 0; i < _options.length; i++) {
        var _value = _options[i].value
        if (_value === entityId) {
          _text = _options[i].text
        }
      }

      if (_text === '') _text = entityId
    } else {
      _text = ' '
    }

    return _text
  }
  
  function buttonHideAndShow(form, status) { 
    if (status == 'A') {//顯示-申報
    	var c_document_button = form.getButton({
    	    id : 'custpage_report_c_document_button'
    	});
    	c_document_button.isHidden = false;
    	
    	var a_document_button = form.getButton({
    	    id : 'custpage_report_a_document_button'
    	});
    	a_document_button.isHidden = true;
    	
    } else if (status == 'C') { //顯示-不申報
    	var c_document_button = form.getButton({
    	    id : 'custpage_report_c_document_button'
    	});
    	c_document_button.isHidden = true;
    	
    	var a_document_button = form.getButton({
    	    id : 'custpage_report_a_document_button'
    	});
    	a_document_button.isHidden = false;
       
    } else { //全部隱藏
    	var c_document_button = form.getButton({
    	    id : 'custpage_report_c_document_button'
    	});
    	c_document_button.isHidden = true;
    	
    	var a_document_button = form.getButton({
    	    id : 'custpage_report_a_document_button'
    	});
    	a_document_button.isHidden = true;
    } 
  }

  /**
   * voucher_type : 憑證類別(EGUI/ALLOWANCE)
   * customerid : 客戶代碼
   * deptcode : 開立部門代碼
   * classification : 開立類別代碼
   * voucher_number : GW憑證號碼
   * transtartdate : 單據日期(起始)
   * tranenddate : 單據日期(截止)
   *
   */
  function searchVoucherList(
    form,
    subListObj,
    voucher_type,
    business_no,
    customerid,
    deptcode,
    classification,
    emplouee_id,
    voucher_upload_status,
    voucher_number,
    transtartdate,
    tranenddate,
    document_type,
    document_no,
    select_year_month
  ) {
    var _mySearch = search.load({
      id: _gw_voucher_main_search_id,
    })

    var _filterArray = []
    _filterArray.push([
      'custrecord_gw_voucher_type',
      search.Operator.IS,
      voucher_type,
    ])
    //不上傳-清單
    _filterArray.push('and')
    //NE-338
    _filterArray.push([
      'custrecord_gw_need_upload_egui_mig',
      search.Operator.IS,
      'RETRIEVE',
    ])
    //排除上傳過
    if (voucher_upload_status != '') {
	    _filterArray.push('and');
	    _filterArray.push(['custrecord_gw_voucher_upload_status',search.Operator.IS, voucher_upload_status]);
    }
    //排除手開發票
    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_is_manual_voucher',
      search.Operator.IS,
      false,
    ])
    //NE-326
    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_voucher_upload_status',
      search.Operator.ISNOT,
      'C',
    ])

    if (select_year_month != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_yearmonth',
        search.Operator.IS,
        select_year_month,
      ])
    }
    if (business_no != '') {
	    _filterArray.push('and')
	    _filterArray.push(['custrecord_gw_seller', search.Operator.IS, business_no])
	}
    if (customerid != '') {
      _filterArray.push('and')
      //_filterArray.push(['custrecord_gw_original_buyer_id', search.Operator.IS, customerid])
      _filterArray.push([
        ['custrecord_gw_original_buyer_id', search.Operator.IS, customerid],
        'or',
        ['custrecord_gw_original_buyer_id', search.Operator.ISEMPTY, ''],
      ])
    }

    /**
       if (deptcode!='') {
				_filterArray.push('and');				
				_filterArray.push(['custrecord_gw_voucher_dept_code','is', deptcode]);					
			}
       if (classification!='') {
				_filterArray.push('and');				
				_filterArray.push(['custrecord_gw_voucher_classification','is', classification]);					
			}
       if (voucher_upload_status!='') {
				_filterArray.push('and');				
				_filterArray.push(['custrecord_gw_voucher_upload_status','is', voucher_upload_status]);					
			}
       */
    //20201207 walter modify
    if (emplouee_id != '') {
      _filterArray.push('and')
      _filterArray.push([
        [
          'custrecord_gw_voucher_main_apply_user_id',
          search.Operator.IS,
          emplouee_id,
        ],
        'or',
        [
          'custrecord_gw_voucher_main_apply_user_id',
          search.Operator.ISEMPTY,
          '',
        ],
      ])
    }
    if (voucher_number != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_number',
        search.Operator.IS,
        voucher_number,
      ])
    }
    if (transtartdate != '') {
      var _date = dateutility.getConvertDateByDate(transtartdate.toString())
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_date',
        search.Operator.GREATERTHANOREQUALTO,
        stringutility.convertToInt(_date),
      ])
    }
    if (tranenddate != '') {
      var _date = dateutility.getConvertDateByDate(tranenddate.toString())
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_date',
        search.Operator.LESSTHANOREQUALTO,
        stringutility.convertToInt(_date),
      ])
    }

    if (document_type != '') {
      _filterArray.push('and')
      _filterArray.push([
        'CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_type',
        search.Operator.IS,
        document_type,
      ])
    }
    if (document_no != '') {
      _filterArray.push('and')
      _filterArray.push([
        'CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_number',
        search.Operator.CONTAINS,
        document_no,
      ])
    }
    _filterArray.push('and')
    _filterArray.push([
      'custrecord_gw_voucher_status',
      'isnot',
      'VOUCHER_UNLOCKED',
    ])
    _mySearch.filterExpression = _filterArray
    log.debug('_filterArray', JSON.stringify(_filterArray))
    ///////////////////////////////////////////////////////////////////////////////////
    var _index = 0
    var _indexId = ''
    var _indexApplyId = ''
    var _documentNos = ''

    var _pagedData = _mySearch.runPaged({
      pageSize: 1000,
    })

    //可申報期別
    var _effectYearMonth = getEffectYearMonth()

    for (var i = 0; i < _pagedData.pageRanges.length; i++) {
      var _currentPage = _pagedData.fetch(i)
      _currentPage.data.forEach(function (result) {
        var _result = JSON.parse(JSON.stringify(result))

        //1.Main Information
        var _id = _result.id //948
        var _mig_type = _result.values.custrecord_gw_mig_type //B2BS, B2BE, B2C
        var _voucher_number = stringutility.trimOrAppendBlank(
          _result.values.custrecord_gw_voucher_number
        )
        var _voucher_date = _result.values.custrecord_gw_voucher_date
        var _voucher_time = _result.values.custrecord_gw_voucher_time
        var _voucher_yearmonth = _result.values.custrecord_gw_voucher_yearmonth
        var _seller = _result.values.custrecord_gw_seller
        var _buyer = _result.values.custrecord_gw_buyer
        var _buyer_name = _result.values.custrecord_gw_buyer_name
        var _invoice_type = _result.values.custrecord_gw_invoice_type
        var _sales_amount = _result.values.custrecord_gw_sales_amount
        var _free_sales_amount = _result.values.custrecord_gw_free_sales_amount
        var _zero_sales_amount = _result.values.custrecord_gw_zero_sales_amount
        var _tax_amount = _result.values.custrecord_gw_tax_amount
        var _tax_rate = _result.values.custrecord_gw_tax_rate
        var _tax_type = _result.values.custrecord_gw_tax_type
        var _total_amount = _result.values.custrecord_gw_total_amount
        var _voucher_dept_code = _result.values.custrecord_gw_voucher_dept_code
        var _voucher_classification =
          _result.values.custrecord_gw_voucher_classification
        var _voucher_status = _result.values.custrecord_gw_voucher_status
        var _voucher_upload_status =
          _result.values.custrecord_gw_voucher_upload_status
        var _discount_count = _result.values.custrecord_gw_discount_count
        var _uploadstatus_messag =
          _result.values.custrecord_gw_uploadstatus_messag
        var _need_upload_egui_mig =
          _result.values.custrecord_gw_need_upload_egui_mig

        //處理 Print 紀錄
        var _is_printed = '' //_mig_type
        var _is_printed_paper = _result.values.custrecord_gw_is_printed_paper
        var _is_printed_pdf = _result.values.custrecord_gw_is_printed_pdf
        if (_is_printed_paper == true || _is_printed_pdf == true)
          _is_printed = '是'

        //四捨五入
        //_tax_rate     = (stringutility.convertToFloat(_tax_rate)/100).toFixed(2);
        _sales_amount = Math.round(
          stringutility.convertToFloat(_sales_amount) +
            stringutility.convertToFloat(_free_sales_amount) +
            stringutility.convertToFloat(_zero_sales_amount)
        ).toString()
        _tax_amount = Math.round(
          stringutility.convertToFloat(_tax_amount)
        ).toString()
        _total_amount = Math.round(
          stringutility.convertToFloat(_total_amount)
        ).toString()

        //Item Details
        var _ns_document_type =
          _result.values[
            'CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_type'
          ]
        var _ns_document_apply_id =
          _result.values[
            'CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_apply_id'
          ]
        var _ns_document_number =
          _result.values[
            'CUSTRECORD_GW_VOUCHER_MAIN_INTERNAL_ID.custrecord_gw_ns_document_number'
          ]

        if (_indexId != _id) {
          if (_indexId != '') _index++

          _documentNos = _ns_document_type + ':' + _ns_document_apply_id + ','

          subListObj.setSublistValue({
            id: 'customer_search_voucher_id',
            line: _index,
            value: _id,
          })
          subListObj.setSublistValue({
            id: 'customer_invoice_tranid',
            line: _index,
            value: _id + '-' + _voucher_number,
          })
          ///////////////////////////////////////////////////////////////////////
          var _params = {
            voucher_type: 'EGUI',
            voucher_internal_id: _id,
          }
          var _url_value = url.resolveScript({
            scriptId: _voucher_view_script_id,
            deploymentId: _voucher_view_deploy_id,
            params: _params,
          })
          _url_value =
            '<a href=' +
            _url_value +
            ' style="text-decoration:none" target=_blank>' +
            _voucher_number +
            '</a>'
          ///////////////////////////////////////////////////////////////////////

          subListObj.setSublistValue({
            id: 'customer_voucher_number',
            line: _index,
            value: _url_value,
          })
          
          subListObj.setSublistValue({
            id: 'customer_voucher_date',
            line: _index,
            value: _voucher_date,
          })
          /**
          subListObj.setSublistValue({
            id: 'customer_voucher_date',
            line: _index,
            value: _voucher_date + ' ' + _voucher_time,
          })
          */
          /**
             subListObj.setSublistValue({
								id : 'customer_voucher_year_month',
								line : _index,
								value : _effectYearMonth
						   });
             */
          subListObj.setSublistValue({
            id: 'customer_original_voucher_year_month',
            line: _index,
            value: _voucher_yearmonth,
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_buyer',
            line: _index,
            value: _buyer_name,
          })

          var _departmentname = getSelectName(
            form,
            'custpage_select_deptcode',
            stringutility.trimOrAppendBlank(_voucher_dept_code)
          )
          subListObj.setSublistValue({
            id: 'customer_voucher_dept_code',
            line: _index,
            value: _departmentname,
          })
          var _classname = getSelectName(
            form,
            'custpage_select_classification',
            stringutility.trimOrAppendBlank(_voucher_classification)
          )
          subListObj.setSublistValue({
            id: 'customer_voucher_class',
            line: _index,
            value: _classname,
          })

          subListObj.setSublistValue({
            id: 'customer_voucher_status',
            line: _index,
            value: _voucher_status,
          })

          var _voucher_status_desc = invoiceutility.getVoucherStatusDesc(
            _voucher_status
          )
          subListObj.setSublistValue({
            id: 'customer_voucher_upload_status',
            line: _index,
            value: _voucher_upload_status,
          })
          /**
          if (stringutility.trim(_need_upload_egui_mig) == 'NONE' && _voucher_upload_status == 'A') {
             _voucher_upload_status = 'M'
          }
          */
          //NE-338
          _voucher_upload_status = 'RT'
          var _voucher_upload_status_desc = invoiceutility.getUploadStatusDesc(_voucher_upload_status)
          if (stringutility.trim(_uploadstatus_messag) != '') {
            _voucher_upload_status_desc =
              _voucher_upload_status_desc +
              ':' +
              stringutility.trim(_uploadstatus_messag)
          } else {
            _voucher_upload_status_desc =
              _voucher_status_desc + ':' + _voucher_upload_status_desc
          }
          _voucher_upload_status_desc = _voucher_upload_status_desc.substring(
            0,
            300
          )
          subListObj.setSublistValue({
            id: 'customer_voucher_upload_status_desc',
            line: _index,
            value: _voucher_upload_status_desc,
          })

          subListObj.setSublistValue({
            id: 'customer_voucher_sales_amount',
            line: _index,
            value: _sales_amount,
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_tax_rate',
            line: _index,
            value: _tax_rate,
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_tax_type',
            line: _index,
            value: gwconfigure.getGwTaxCodeNameByGWTaxCode(_tax_type),
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_tax_amount',
            line: _index,
            value: _tax_amount,
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_total_amount',
            line: _index,
            value: _total_amount,
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_isprinted',
            line: _index,
            value: stringutility.trimOrAppendBlank(_is_printed),
          })

          _indexId = _id
        }

        var _applyId = _ns_document_type + ':' + _ns_document_number + ','
        var _relate_number = subListObj.getSublistValue({
          id: 'customer_voucher_relate_number',
          line: _index,
        })
        if (stringutility.trim(_relate_number).indexOf(_applyId) == -1) {
          subListObj.setSublistValue({
            id: 'customer_voucher_relate_number',
            line: _index,
            value: stringutility
              .trimOrAppendBlank(stringutility.trim(_relate_number) + _applyId)
              .substring(0, 300),
          })
        }
      })
    }
    ///////////////////////////////////////////////////////////////////////////////////
  }

  function createForm(form) {
    ///////////////////////////////////////////////////////////////////////////////////
    //查詢條件
    //公司別
    var _selectBusinessNo = form.addField({
      id: 'custpage_businessno',
      type: serverWidget.FieldType.SELECT,
      label: '統一編號',
    })
    _selectBusinessNo.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    /**
    _selectBusinessNo.addSelectOption({
      value: _ban,
      text: _legalname,
    })
    */
    ////////////////////////////////////////////////////////////////////////////
    var currentUserObject = runtime.getCurrentUser()
    var _company_ary = invoiceutility.getBusinessEntitByUserId(currentUserObject)
    gwLibSuiteLetUtility.addBusinessEntitySelectOption(_company_ary, _selectBusinessNo)
    ////////////////////////////////////////////////////////////////////////////
	    
    //客戶代碼
    var _selectCustomerCode = form.addField({
      id: 'custpage_selectcustomerid',
      type: serverWidget.FieldType.SELECT,
      source: 'customer',
      label: '買方公司',
    })
    _selectCustomerCode.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })

    //部門代碼
    var _selectDeptCode = form.addField({
      id: 'custpage_select_deptcode',
      type: serverWidget.FieldType.SELECT,
      label: '發票部門',
    })
    _selectDeptCode.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectDeptCode.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    _selectDeptCode.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    var _deptCodeSearch = search
      .create({
        type: search.Type.DEPARTMENT,
        columns: ['internalid', 'name'],
      })
      .run()
      .each(function (result) {
        var _internalid = result.id
        var _entityid = result.getValue({
          name: 'internalid',
        })
        var _name = result.getValue({
          name: 'name',
        })

        _selectDeptCode.addSelectOption({
          value: _internalid,
          text: _internalid + '-' + _name,
        })
        return true
      })
    //類別代碼
    var _selectClassification = form.addField({
      id: 'custpage_select_classification',
      type: serverWidget.FieldType.SELECT,
      label: '發票分類',
    })
    _selectClassification.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectClassification.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    _selectClassification.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    var _classificationSearch = search
      .create({
        type: search.Type.CLASSIFICATION,
        columns: ['internalid', 'name'],
      })
      .run()
      .each(function (result) {
        var _internalid = result.id
        var _entityid = result.getValue({
          name: 'internalid',
        })
        var _name = result.getValue({
          name: 'name',
        })

        _selectClassification.addSelectOption({
          value: _internalid,
          text: _internalid + '-' + _name,
        })
        return true
      })
    //20201207 walter modify
    var _selectEmployee = form.addField({
      id: 'custpage_select_emplouee_id',
      type: serverWidget.FieldType.SELECT,
      label: '處理人員',
      source: 'employee',
    })
    _selectEmployee.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    /**
    //單據狀態
    var _selectUploadStatus = form.addField({
      id: 'custpage_select_voucher_upload_status',
      type: serverWidget.FieldType.SELECT,
      label: '上傳狀態',
    })
    _selectUploadStatus.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectUploadStatus.addSelectOption({
      value: 'A',
      text: '待上傳',
    })
    _selectUploadStatus.addSelectOption({
      value: 'P',
      text: '上傳中',
    })
    _selectUploadStatus.addSelectOption({
      value: 'C',
      text: '開立成功',
    })
    _selectUploadStatus.addSelectOption({
      value: 'E',
      text: '開立失敗',
    })
    _selectUploadStatus.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    _selectUploadStatus.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    */
    //Invoice單據類別
    var _selectVoucherType = form.addField({
      id: 'custpage_select_document_type',
      type: serverWidget.FieldType.SELECT,
      label: 'NS 單據類別',
    })
    _selectVoucherType.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectVoucherType.addSelectOption({
      value: 'INVOICE',
      text: 'INVOICE',
    })
    _selectVoucherType.addSelectOption({
      value: 'CREDITMEMO',
      text: 'CREDIT MEMO',
    })
    _selectVoucherType.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    
    var _selectVoucherType = form.addField({
      id: 'custpage_select_voucher_upload_status',
      type: serverWidget.FieldType.SELECT,
      label: '申報類別',
    })
    _selectVoucherType.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectVoucherType.addSelectOption({
      value: 'C',
      text: '申報',
    })
    _selectVoucherType.addSelectOption({
      value: 'A',
      text: '不申報',
    })
    _selectVoucherType.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    
    var _document_no = form.addField({
      id: 'custpage_select_document_no',
      type: serverWidget.FieldType.TEXT,
      label: 'NS 單據編號',
    })
    _document_no.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })

    //EGUI單據號碼
    var _voucher_number = form.addField({
      id: 'custpage_select_voucher_number',
      type: serverWidget.FieldType.TEXT,
      label: 'e-GUI CM #',
    })
    _voucher_number.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
     
    //單據日期
    var _tran_start_date = form.addField({
      id: 'custpage_select_transtartdate',
      type: serverWidget.FieldType.DATE,
      label: 'e-GUI CM #開始日期',
    })
    _tran_start_date.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _tran_start_date.defaultValue = new Date()

    var _tran_end_date = form.addField({
      id: 'custpage_select_tranenddate',
      type: serverWidget.FieldType.DATE,
      label: 'e-GUI CM #結束日期',
    })
    _tran_end_date.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    var _year_month_field = form.addField({
      id: 'custpage_select_year_month',
      type: serverWidget.FieldType.TEXT,
      label: '申報期別',
    })
    _year_month_field.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
  }

  //發票明細
  function createInvoiceSubList(form) {
    var _sublist = form.addSublist({
      id: 'vouchersublistid',
      type: serverWidget.SublistType.LIST,
      label: 'e-GUI CM # List',
    })

    _sublist.addButton({
      id: 'buttonid_mark',
      label: 'Mark All',
      functionName:
        'mark(true,"vouchersublistid","customer_search_voucher_id","customer_search_voucher_check_id")',
    })

    _sublist.addButton({
      id: 'buttonid_unmark',
      label: 'Unmark All',
      functionName:
        'mark(false,"vouchersublistid","customer_search_voucher_id","customer_search_voucher_check_id")',
    })
    /////////////////////////////////////////////////////////////////////////////
    //access check box
    var _idField = _sublist.addField({
      id: 'customer_search_voucher_id',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT,
    })
    _idField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    var _checkboxfield = _sublist.addField({
      id: 'customer_search_voucher_check_id',
      type: serverWidget.FieldType.CHECKBOX,
      label: 'SELECT',
    })
    _checkboxfield.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.NORMAL,
    })
    var _uploadStatusField = _sublist.addField({
      id: 'customer_voucher_upload_status',
      label: 'Status ID',
      type: serverWidget.FieldType.TEXT,
    })
    _uploadStatusField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    var _voucherStatusField = _sublist.addField({
      id: 'customer_voucher_status',
      label: 'Voucher Status',
      type: serverWidget.FieldType.TEXT,
    })
    _voucherStatusField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    /////////////////////////////////////////////////////////////////////////////
    //處理顯示欄位
    var _voucherDateField = _sublist.addField({
      id: 'customer_voucher_reupload_date',
      type: serverWidget.FieldType.DATE,
      label: 'e-GUI CM 新上傳日期',
    })
    _voucherDateField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY,
    })

    var _voucherYearMonthField = _sublist.addField({
      id: 'customer_voucher_year_month',
      type: serverWidget.FieldType.TEXT,
      label: '可申報期別',
    })
    _voucherYearMonthField.maxLength = 5
    _voucherYearMonthField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY,
    })

    _sublist.addField({
      id: 'customer_voucher_number',
      type: serverWidget.FieldType.TEXT,
      label: 'e-GUI CM #',
    })
    _sublist.addField({
      id: 'customer_voucher_date',
      type: serverWidget.FieldType.TEXT,
      label: 'e-GUI CM 原開立日期',
    })
    _sublist.addField({
      id: 'customer_voucher_relate_number',
      type: serverWidget.FieldType.TEXT,
      label: 'NS Inv/CM #',
    })
    _sublist.addField({
      id: 'customer_voucher_buyer',
      type: serverWidget.FieldType.TEXT,
      label: '買方公司',
    })
    _sublist.addField({
      id: 'customer_voucher_dept_code',
      type: serverWidget.FieldType.TEXT,
      label: '發票部門',
    })
    _sublist.addField({
      id: 'customer_voucher_class',
      type: serverWidget.FieldType.TEXT,
      label: '發票分類',
    })
    _sublist.addField({
      id: 'customer_voucher_upload_status_desc',
      type: serverWidget.FieldType.TEXT,
      label: '上傳狀態',
    })
    _sublist.addField({
      id: 'customer_voucher_sales_amount',
      type: serverWidget.FieldType.TEXT,
      label: '銷售額',
    })
    _sublist.addField({
      id: 'customer_voucher_tax_rate',
      type: serverWidget.FieldType.TEXT,
      label: '稅率',
    })
    _sublist.addField({
      id: 'customer_voucher_tax_type',
      type: serverWidget.FieldType.TEXT,
      label: '課稅別',
    })
    _sublist.addField({
      id: 'customer_voucher_tax_amount',
      type: serverWidget.FieldType.TEXT,
      label: '稅額',
    })
    _sublist.addField({
      id: 'customer_voucher_total_amount',
      type: serverWidget.FieldType.TEXT,
      label: '總計',
    })
    _sublist.addField({
      id: 'customer_voucher_isprinted',
      type: serverWidget.FieldType.TEXT,
      label: '已列印',
    })
    _sublist.addField({
      id: 'customer_original_voucher_year_month',
      type: serverWidget.FieldType.TEXT,
      label: '憑證期別',
    })
    ////////////////////////////////////////////////////////////////////////////////////////////
    return _sublist
  }

  function onRequest(context) {
    ////////////////////////////////////////////////////////////////////////////
    var form = serverWidget.createForm({
      title: '折讓(電子發票)回收作業',
    })
    //Hiddent Element
    var _hidden_button_field = form.addField({
      id: 'custpage_hiddent_buttontype',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN',
    })
    _hidden_button_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    //紀錄 Invoice selected
    var _hidden_voucher_listld = form.addField({
      id: 'custpage_voucher_hiddent_listid',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN',
    })
    _hidden_voucher_listld.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    //紀錄 CreditMemo selected
    var _hidden_creditmemo_listld = form.addField({
      id: 'custpage_creditmemo_hiddent_listid',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN',
    })
    _hidden_creditmemo_listld.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    ////////////////////////////////////////////////////////////////////////////
    createForm(form)
    var _invoiceSubList = createInvoiceSubList(form)

    var c_document_button = form.addButton({
      id: 'custpage_report_c_document_button',
      label: '申報',
      functionName: 'reportTxtNotUpload("ALLOWANCE","C")',
    }) 
    c_document_button.isHidden = true;
    
    var a_document_button = form.addButton({
      id: 'custpage_report_a_document_button',
      label: '不申報',
      functionName: 'reportTxtNotUpload("ALLOWANCE","A")',
    })
    a_document_button.isHidden = true;
    
    form.addButton({
      id: 'custpage_cancel_document_button',
      label: '上傳折讓單',
      functionName: 'reSendToGWProcess("ALLOWANCE")',
    })
    form.addButton({
      id: 'custpage_search_document_button',
      label: '查詢',
      functionName: 'searchResults()',
    })

    //form.clientScriptModulePath = './gw_egui_common_ui_event.js';
    form.clientScriptModulePath = './gw_egui_common_ui_event_v2.js'

    context.response.writePage(form)

    if (context.request.method === 'POST') {
      //Open Document
      var _buttonType = context.request.parameters.custpage_hiddent_buttontype
      var _voucher_list_id =
        context.request.parameters.custpage_voucher_hiddent_listid
      log.debug('_buttonType: ', _buttonType)

      var _scriptObj = runtime.getCurrentScript()
      var _scriptId = _scriptObj.id
      var _deploymentId = _scriptObj.deploymentId

      //search
      var _select_businessno =
          context.request.parameters.custpage_businessno
      var _select_year_month =
        context.request.parameters.custpage_select_year_month
      var _selectcustomerid =
        context.request.parameters.custpage_selectcustomerid
      var _select_deptcode = context.request.parameters.custpage_select_deptcode
      var _select_classification =
        context.request.parameters.custpage_select_classification
      var _select_emplouee_id =
        context.request.parameters.custpage_select_emplouee_id
      var _select_voucher_number =
        context.request.parameters.custpage_select_voucher_number
      var _select_transtartdate =
        context.request.parameters.custpage_select_transtartdate
      var _select_tranenddate =
        context.request.parameters.custpage_select_tranenddate
      var _select_document_type =
        context.request.parameters.custpage_select_document_type
      var _select_document_no =
        context.request.parameters.custpage_select_document_no
      var _select_voucher_upload_status =
        context.request.parameters.custpage_select_voucher_upload_status

      buttonHideAndShow(form, _select_voucher_upload_status)
      
      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      if(!_select_businessno) return
      var _businessnoField = form.getField({
  	      id: 'custpage_businessno',
  	  })
  	  _businessnoField.defaultValue = _select_businessno
        var _yearMonthField = form.getField({
        id: 'custpage_select_year_month',
      })
      if (_select_year_month !== '') {
        _yearMonthField.defaultValue = _select_year_month
      }
      var _customeridField = form.getField({
        id: 'custpage_selectcustomerid',
      })
      if (_selectcustomerid !== '') {
        _customeridField.defaultValue = _selectcustomerid
      }
      var _emploueeField = form.getField({
        id: 'custpage_select_emplouee_id',
      })
      _emploueeField.defaultValue = _select_emplouee_id

      var _voucherNumberField = form.getField({
        id: 'custpage_select_voucher_number',
      })
      _voucherNumberField.defaultValue = _select_voucher_number

      var _transtartdateField = form.getField({
        id: 'custpage_select_transtartdate',
      })
      _transtartdateField.defaultValue = _select_transtartdate
      var _tranenddateField = form.getField({
        id: 'custpage_select_tranenddate',
      })
      _tranenddateField.defaultValue = _select_tranenddate

      var _documentTypeField = form.getField({
        id: 'custpage_select_document_type',
      })
      _documentTypeField.defaultValue = _select_document_type
      var _documentNoField = form.getField({
        id: 'custpage_select_document_no',
      })
      _documentNoField.defaultValue = _select_document_no
      
      var _voucher_upload_status_field = form.getField({
          id: 'custpage_select_voucher_upload_status',
      })
      _voucher_upload_status_field.defaultValue = _select_voucher_upload_status

      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      //1.Get ALLOWANCE LIST _invoiceSubList
      var _voucher_type = 'ALLOWANCE'
      searchVoucherList(
        form,
        _invoiceSubList,
        _voucher_type,
        _select_businessno,
        _selectcustomerid,
        _select_deptcode,
        _select_classification,
        _select_emplouee_id,
        _select_voucher_upload_status,
        _select_voucher_number,
        _select_transtartdate,
        _select_tranenddate,
        _select_document_type,
        _select_document_no,
        _select_year_month
      )
      //search result end
      //end access file
    }        
  } //End onRequest

  return {
    onRequest: onRequest,
  }
})
