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
  'N/record',
  'N/file',
  'N/url',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_date_utility',
  '../gw_common_utility/gw_common_configure',
], function (
  runtime,
  serverWidget,
  redirect,
  search,
  format,
  record,
  file,
  url,
  stringutility,
  invoiceutility,
  dateutility,
  gwconfigure
) {
  var defaultAccount = gwconfigure.getGwInvoiceEditDefaultAccount()
  var _gwVoucherGenxmlScriptId = gwconfigure.getGwVoucherGenxmlScriptId()
  var _gwVoucherGenxmlDeployId = gwconfigure.getGwVoucherGenxmlDeploymentId()

  var _gw_voucher_main_search_id = gwconfigure.getGwVoucherMainSearchId()

  var _voucher_main_record = gwconfigure.getGwVoucherMainRecord()
  var _voucher_details_record = gwconfigure.getGwVoucherDetailsRecord()

  //憑證 Information View
  var _voucher_view_script_id = 'customscript_gw_egui_ui_view'
  var _voucher_view_deploy_id = 'customdeploy_gw_egui_ui_view'

  var _gw_mig_a0101_xml_path = gwconfigure.getGwMigA0101XmlPath()
  var _gw_mig_a0401_xml_path = gwconfigure.getGwMigA0401XmlPath()
  var _gw_mig_c0401_xml_path = gwconfigure.getGwMigC0401XmlPath()
  var _gw_mig_b0101_xml_path = gwconfigure.getGwMigB0101XmlPath()
  var _gw_mig_b0401_xml_path = gwconfigure.getGwMigB0401XmlPath()
  var _gw_mig_d0401_xml_path = gwconfigure.getGwMigD0401XmlPath() //C0401的折讓單
  var _version = gwconfigure.getGwMigVersion() //GateWeb API Version

  //欄位寬度
  var _field_height = 80
  var _field_width = 150
  var _field_text_width = 20

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

  function loadInvoiceMigXml(voucherType, migType) {
    var _xmlString
    try {
      var _file_path = ''
      if (voucherType === 'EGUI') {
        if (migType == 'B2BE') {
          _file_path = _gw_mig_a0101_xml_path
        } else if (migType == 'B2BS') {
          //_file_path = _gw_mig_a0401_xml_path;
          _file_path = _gw_mig_c0401_xml_path //A0401轉成C0401
        } else if (migType == 'B2C') {
          _file_path = _gw_mig_c0401_xml_path
        }
      } else if (voucherType === 'ALLOWANCE') {
        if (migType == 'B2BE') {
          //TODO
          _file_path = _gw_mig_b0101_xml_path
        } else if (migType == 'B2BS') {
          //_file_path = _gw_mig_b0401_xml_path;
          _file_path = _gw_mig_d0401_xml_path //B0401轉成D0401
        } else if (migType == 'B2C') {
          _file_path = _gw_mig_d0401_xml_path
        }
      }
      if (_file_path !== '') _xmlString = file.load(_file_path).getContents()
    } catch (e) {
      log.debug(e.name, e.message)
    }
    return _xmlString
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
    select_voucher_status,
    voucher_upload_status,
    voucher_number,
    transtartdate,
    tranenddate,
    document_type,
    document_no,
    voucher_print_type,
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
    if (business_no != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_seller',
        search.Operator.IS,
        business_no,
      ])
    }
    if (select_year_month != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_yearmonth',
        search.Operator.IS,
        select_year_month,
      ])
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
    if (deptcode != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_dept_code',
        search.Operator.IS,
        deptcode,
      ])
    }
    if (classification != '') {
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_voucher_classification',
        search.Operator.IS,
        classification,
      ])
    }
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
    ///////////////////////////////////////////////////////////////////////////
    //20201201 walter modify
    if (voucher_print_type != '') {
      if (voucher_print_type == 'DOWN_LOAD_PDF') {
        //已下載PDF
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_is_printed_pdf',
          search.Operator.IS,
          true,
        ])
      } else if (voucher_print_type == 'NOT_DOWN_LOAD_PDF') {
        //未下載PDF
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_is_printed_pdf',
          search.Operator.IS,
          false,
        ])
      } else if (voucher_print_type == 'IS_PRINT_PAPER') {
        //已列印
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_is_printed_paper',
          search.Operator.IS,
          true,
        ])
      } else if (voucher_print_type == 'NOT_PRINT_PAPER') {
        //未列印
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_is_printed_paper',
          search.Operator.IS,
          false,
        ])
      } else if (voucher_print_type == 'NOT_PRINT_ALL') {
        //未下載PDF+列印
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_is_printed_pdf',
          search.Operator.IS,
          false,
        ])
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_is_printed_paper',
          search.Operator.IS,
          false,
        ])
      } else if (voucher_print_type == 'IS_PRINT_ALL') {
        //已下載PDF+列印
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_is_printed_pdf',
          search.Operator.IS,
          true,
        ])
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_is_printed_paper',
          search.Operator.IS,
          true,
        ])
      }
    }

    if (select_voucher_status != '') {
      if (select_voucher_status == 'MANUAL_EGUI_INVOICE') {
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_is_manual_voucher',
          search.Operator.IS,
          true,
        ])
      } else {
        var _status_ary = select_voucher_status.split('-')
        if (_status_ary.length != 0) {
          _filterArray.push('and')
          var _subFilterArray = []
          for (var i = 0; i < _status_ary.length; i++) {
            var _status = _status_ary[i]

            if (i != 0) _subFilterArray.push('or')
            _subFilterArray.push([
              'custrecord_gw_voucher_status',
              search.Operator.IS,
              _status,
            ])
          }
          _filterArray.push(_subFilterArray)
        }
      }
    }
    ///////////////////////////////////////////////////////////////////////////
    //20201201 walter modify
    if (voucher_upload_status != '') {
      _filterArray.push('and')
      if (voucher_upload_status == 'NONE') {
        _filterArray.push([
          'custrecord_gw_need_upload_egui_mig',
          search.Operator.IS,
          voucher_upload_status,
        ])
      } else {
        _filterArray.push([
          'custrecord_gw_voucher_upload_status',
          search.Operator.IS,
          voucher_upload_status,
        ])
        _filterArray.push('and')
        _filterArray.push([
          'custrecord_gw_need_upload_egui_mig',
          search.Operator.ISNOT,
          'NONE',
        ])
      }
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
    log.debug('UI List filterArray', JSON.stringify(_filterArray))
    ///////////////////////////////////////////////////////////////////////////////////
    var _index = 0
    var _indexId = ''
    var _indexApplyId = ''
    var _documentNos = ''

    var _pagedData = _mySearch.runPaged({
      pageSize: 1000,
    })
    for (var i = 0; i < _pagedData.pageRanges.length; i++) {
      var _currentPage = _pagedData.fetch(i)
      _currentPage.data.forEach(function (result) {
        var _result = JSON.parse(JSON.stringify(result))
        log.debug({ title: 'search each result', details: result })
        //1.Main Information
        var _id = _result.id //948
        var _mig_type = _result.values.custrecord_gw_mig_type //B2BS, B2BE, B2C
        var _voucher_number = _result.values.custrecord_gw_voucher_number
        var _voucher_date = _result.values.custrecord_gw_voucher_date
        var _voucher_time = _result.values.custrecord_gw_voucher_time
        var _voucher_yearmonth = _result.values.custrecord_gw_voucher_yearmonth
        var _seller = _result.values.custrecord_gw_seller
        var _buyer = _result.values.custrecord_gw_buyer
        var _buyer_name = _result.values.custrecord_gw_buyer_name
        var _invoice_type = _result.values.custrecord_gw_invoice_type
        var _voucher_format_code = _result.values.custrecord_gw_voucher_format_code
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
        var _print_mark = _result.values.custrecord_gw_print_mark
        var _uploadstatus_messag =
          _result.values.custrecord_gw_uploadstatus_messag
        var _need_upload_egui_mig =
          _result.values.custrecord_gw_need_upload_egui_mig //Y/N

        //處理 Print 紀錄
        var _is_printed = '' //_mig_type
        var _is_printed_paper = _result.values.custrecord_gw_is_printed_paper
        var _is_printed_pdf = _result.values.custrecord_gw_is_printed_pdf
        if (_is_printed_paper == true) _is_printed = '是'

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

          _documentNos = '' //需設空值

          subListObj.setSublistValue({
            id: 'customer_voucher_year_month',
            line: _index,
            value: _voucher_yearmonth,
          })

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
          ///////////////////////////////////////////////////////////////////////
          subListObj.setSublistValue({
            id: 'customer_voucher_date',
            line: _index,
            value: _voucher_date + ' ' + _voucher_time,
          })
          subListObj.setSublistValue({
            id: 'customer_voucher_buyer',
            line: _index,
            value: stringutility.trimOrAppendBlank(_buyer_name),
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
          var _voucher_manual_egui = ' '
          if (
            stringutility.trim(_need_upload_egui_mig) == 'N' ||
            stringutility.trim(_need_upload_egui_mig) == 'NONE'
          ) {
            _voucher_manual_egui = '是'
            //_voucher_upload_status = 'M'
           	//NE-338
           	if (_voucher_format_code!='35')_voucher_upload_status = 'M'
            else _voucher_upload_status = 'EU'  	
          }

          var _voucher_upload_status_desc = invoiceutility.getUploadStatusDesc(
            _voucher_upload_status
          )
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
          var _discounted = ' '
          if (parseInt(_discount_count) > 0) _discounted = '是'
          subListObj.setSublistValue({
            id: 'customer_voucher_discounted',
            line: _index,
            value: _discounted,
          })

          subListObj.setSublistValue({
            id: 'customer_voucher_manual_egui',
            line: _index,
            value: _voucher_manual_egui,
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
	//賣方公司
    var _selectBusinessNo = form.addField({
      id: 'custpage_businessno',
      type: serverWidget.FieldType.SELECT,
      label: '統一編號',
    })
    _selectBusinessNo.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    ////////////////////////////////////////////////////////////////////////////
    //20210427 walter 增加賣方公司 List
    var _user_obj        = runtime.getCurrentUser()
    var _user_subsidiary = _user_obj.subsidiary
    
    var _company_ary = invoiceutility.getBusinessEntitByUserId(_user_obj.id, _user_subsidiary)
    if (_company_ary!=null) {
    	for (var i=0; i<_company_ary.length; i++) {
    		var _company = _company_ary[i];
    		
    		_selectBusinessNo.addSelectOption({
    	          value: _company.tax_id_number,
    	          text: _company.tax_id_number + '-' + _company.be_gui_title,
    	        })
    	}
    }  
    ////////////////////////////////////////////////////////////////////////////
    //客戶代碼
    var _selectCustomerCode = form.addField({
      id: 'custpage_selectcustomerid',
      type: serverWidget.FieldType.SELECT,
      label: '買方公司',
      source: 'customer',
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
    _selectDeptCode.updateDisplaySize({
      height: _field_height,
      width: _field_width,
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
    _selectClassification.updateDisplaySize({
      height: _field_height,
      width: _field_width,
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
    ///////////////////////////////////////////////////////////////////////////
    //單據類別
    var _selectVoucherStatus = form.addField({
      id: 'custpage_select_voucher_status',
      type: serverWidget.FieldType.SELECT,
      label: 'eGUI-憑證類別',
    })
    _selectVoucherStatus.updateDisplaySize({
      height: _field_height,
      width: _field_width,
    })
    _selectVoucherStatus.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectVoucherStatus.addSelectOption({
      value: 'VOUCHER_ISSUE-VOUCHER_SUCCESS-VOUCHER_ERROR',
      text: '開立憑證',
    })
    /////////////////////////////////////////////////////////////////
    _selectVoucherStatus.addSelectOption({
      value:
        'CANCEL_ISSUE-CANCEL_APPROVE-CANCEL_REJECT-CANCEL_UPLOAD-CANCEL_SUCCESS-CANCEL_ERROR',
      text: '作廢憑證',
    })
    _selectVoucherStatus.addSelectOption({
      value: 'MANUAL_EGUI_INVOICE',
      text: '歷史發票',
    })
    _selectVoucherStatus.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    ///////////////////////////////////////////////////////////////////////////
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
    _selectUploadStatus.addSelectOption({
      value: 'NONE',
      text: '不上傳',
    })
    _selectUploadStatus.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    _selectUploadStatus.updateDisplaySize({
      height: _field_height,
      width: _field_width,
    })
    //////////////////////////////////////////////////////////////////////
    //change line
    /**
     var _selectEmployee = form.addField({
				id: 'custpage_select_employee',
				type: serverWidget.FieldType.SELECT,
				label: '處理人員',
				source: 'employee' 
			});
     _selectEmployee.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
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
    _selectVoucherType.addSelectOption({
      value: 'CUSTOMER_DEPOSIT',
      text: 'CUSTOMER DEPOSIT',
    })
    _selectVoucherType.addSelectOption({
      value: 'SALES_ORDER',
      text: 'SALES ORDER',
    })
    _selectVoucherType.addSelectOption({
      value: 'CASH_SALE',
      text: 'CASH SALE',
    })
    _selectVoucherType.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _selectVoucherType.updateDisplaySize({
      height: _field_height,
      width: _field_width,
    })
    var _document_no = form.addField({
      id: 'custpage_select_document_no',
      type: serverWidget.FieldType.TEXT,
      label: 'NS 單據編號',
    })
    _document_no.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _document_no.updateDisplaySize({
      height: _field_height,
      width: _field_text_width,
    })

    //EGUI單據號碼
    var _voucher_number = form.addField({
      id: 'custpage_select_voucher_number',
      type: serverWidget.FieldType.TEXT,
      label: 'e-GUI #',
    })
    _voucher_number.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _voucher_number.updateDisplaySize({
      height: _field_height,
      width: _field_text_width,
    })

    //單據日期
    var _tran_start_date = form.addField({
      id: 'custpage_select_transtartdate',
      type: serverWidget.FieldType.DATE,
      label: 'e-GUI開始日期',
    })
    _tran_start_date.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _tran_start_date.updateDisplaySize({
      height: _field_height,
      width: _field_width,
    })
    _tran_start_date.defaultValue = new Date()

    var _tran_end_date = form.addField({
      id: 'custpage_select_tranenddate',
      type: serverWidget.FieldType.DATE,
      label: 'e-GUI結束日期',
    })
    _tran_end_date.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _tran_end_date.updateDisplaySize({
      height: _field_height,
      width: _field_width,
    })
    //列印條件
    var _selectPrintField = form.addField({
      id: 'custpage_select_voucher_print_type',
      type: serverWidget.FieldType.SELECT,
      label: '列印條件',
    })
    _selectPrintField.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectPrintField.addSelectOption({
      value: 'IS_PRINT_PAPER',
      text: '已列印',
    })
    _selectPrintField.addSelectOption({
      value: 'NOT_PRINT_PAPER',
      text: '未列印',
    })
    _selectPrintField.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _selectPrintField.updateDisplaySize({
      height: _field_height,
      width: _field_width,
    })
    var _year_month_field = form.addField({
      id: 'custpage_select_year_month',
      type: serverWidget.FieldType.TEXT,
      label: '申報期別',
    })
    _year_month_field.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _year_month_field.updateDisplaySize({
      height: _field_height,
      width: _field_text_width,
    })
  }

  //發票明細
  function createInvoiceSubList(form) {
    var _sublist = form.addSublist({
      id: 'vouchersublistid',
      type: serverWidget.SublistType.LIST,
      label: 'e-GUI # List',
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
      label: '順序',
    })
    _checkboxfield.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY,
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
    /////////////////////////////////////////////////////////////////////////////
    _sublist.addField({
      id: 'customer_voucher_number',
      type: serverWidget.FieldType.TEXT,
      label: 'e-GUI #',
    })
    _sublist.addField({
      id: 'customer_voucher_date',
      type: serverWidget.FieldType.TEXT,
      label: 'e-GUI Date',
    })
    _sublist.addField({
      id: 'customer_voucher_relate_number',
      type: serverWidget.FieldType.TEXT,
      label: 'NS Inv/CM #',
    })
    _sublist.addField({
      id: 'customer_voucher_year_month',
      type: serverWidget.FieldType.TEXT,
      label: '申報期別',
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
      id: 'customer_voucher_discounted',
      type: serverWidget.FieldType.TEXT,
      label: '是否折讓',
    })
    _sublist.addField({
      id: 'customer_voucher_manual_egui',
      type: serverWidget.FieldType.TEXT,
      label: '是否歷史或外部發票',
    })
    _sublist.addField({
      id: 'customer_voucher_isprinted',
      type: serverWidget.FieldType.TEXT,
      label: '已列印',
    })
    ////////////////////////////////////////////////////////////////////////////////////////////
    return _sublist
  }

  function onRequest(context) {
    ////////////////////////////////////////////////////////////////////////////
    var form = serverWidget.createForm({
      title: '電子發票列印作業',
    })
    /////////////////////////////////////////////////////////////////////////////
    var _voucher_type = 'EGUI'
    var _b2bs_xml = loadInvoiceMigXml(_voucher_type, 'B2BS')
    var _b2be_xml = loadInvoiceMigXml(_voucher_type, 'B2BE')
    var _b2c_xml = loadInvoiceMigXml(_voucher_type, 'B2C')

    var _b2bs_xml_field = form.addField({
      id: 'custpage_b2bs_xml_field',
      type: serverWidget.FieldType.RICHTEXT,
      label: 'HIDDEN',
    })
    _b2bs_xml_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    _b2bs_xml_field.defaultValue = _b2bs_xml

    var _b2be_xml_field = form.addField({
      id: 'custpage_b2be_xml_field',
      type: serverWidget.FieldType.RICHTEXT,
      label: 'HIDDEN',
    })
    _b2be_xml_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    _b2be_xml_field.defaultValue = _b2be_xml

    var _b2c_xml_field = form.addField({
      id: 'custpage_b2c_xml_field',
      type: serverWidget.FieldType.RICHTEXT,
      label: 'HIDDEN',
    })
    _b2c_xml_field.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    _b2c_xml_field.defaultValue = _b2c_xml

    ////////////////////////////////////////////////////////////////////////////
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

    ////////////////////////////////////////////////////////////////////////////
    createForm(form)
    var _invoiceSubList = createInvoiceSubList(form)

    form.addButton({
      id: 'custpage_search_document_button',
      label: '查詢',
      functionName: 'searchResults()',
    })

    //form.clientScriptModulePath = './gw_egui_common_ui_event.js'
    form.clientScriptModulePath = './gw_egui_common_ui_event_v2.js'

    context.response.writePage(form)

    var _buttonType = context.request.parameters.custpage_hiddent_buttontype
    if (context.request.method === 'POST' || _buttonType == 'ReSearch') {
      //Open Document
      var _voucher_list_id =
        context.request.parameters.custpage_voucher_hiddent_listid
      log.debug('_buttonType: ', _buttonType)

      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //search
      var _select_business_no =
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
      var _select_voucher_status =
        context.request.parameters.custpage_select_voucher_status
      var _select_voucher_print_type =
        context.request.parameters.custpage_select_voucher_print_type
      ////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      var _scriptObj = runtime.getCurrentScript()
      var _scriptId = _scriptObj.id
      var _deploymentId = _scriptObj.deploymentId
      log.debug('_selectcustomerid: ', _selectcustomerid)
      log.debug('ScriptId Id: ', _scriptId)
      log.debug('Deployment Id: ', _deploymentId)
      if (
        stringutility.trim(_buttonType) === 'printPaper' ||
        stringutility.trim(_buttonType) === 'printPDF'
      ) {
        //列印Paper , PDF
        var _userObj = runtime.getCurrentUser()
        var _arrParams = {
          forwardscriptId: _scriptId,
          forwarddeploymentId: _deploymentId,
          userId: _userObj.id,
          userName: _userObj.name,
          voucher_type: 'EGUI',
          taskType: _buttonType,
          voucher_list_id: _voucher_list_id,
          custpage_selectcustomerid: _selectcustomerid,
          custpage_select_deptcode: _select_deptcode,
          custpage_select_classification: _select_classification,
          custpage_select_voucher_number: _select_voucher_number,
          custpage_select_transtartdate: _select_transtartdate,
          custpage_select_tranenddate: _select_tranenddate,
          custpage_select_document_type: _select_document_type,
          custpage_select_document_no: _select_document_no,
          custpage_select_voucher_upload_status: _select_voucher_upload_status,
        }

        redirect.toSuitelet({
          scriptId: _gwVoucherGenxmlScriptId,
          deploymentId: _gwVoucherGenxmlDeployId,
          parameters: _arrParams,
        })
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      var _businessnoField = form.getField({
          id: 'custpage_businessno',
      })
      if (_select_business_no !== '') {
      	  _businessnoField.defaultValue = _select_business_no
      }
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
      var _deptcodeField = form.getField({
        id: 'custpage_select_deptcode',
      })
      _deptcodeField.defaultValue = _select_deptcode
      var _classificationField = form.getField({
        id: 'custpage_select_classification',
      })
      _classificationField.defaultValue = _select_classification
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
      var _voucherUploadStatusField = form.getField({
        id: 'custpage_select_voucher_upload_status',
      })
      _voucherUploadStatusField.defaultValue = _select_voucher_upload_status

      var _voucherStatusField = form.getField({
        id: 'custpage_select_voucher_status',
      })
      _voucherStatusField.defaultValue = _select_voucher_status
      var voucherPrintTypeField = form.getField({
        id: 'custpage_select_voucher_print_type',
      })
      voucherPrintTypeField.defaultValue = _select_voucher_print_type
      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      //1.Get Invoice LIST _invoiceSubList
      var _voucher_type = 'EGUI'
      searchVoucherList(
        form,
        _invoiceSubList,
        _voucher_type,
        _select_business_no,
        _selectcustomerid,
        _select_deptcode,
        _select_classification,
        _select_emplouee_id,
        _select_voucher_status,
        _select_voucher_upload_status,
        _select_voucher_number,
        _select_transtartdate,
        _select_tranenddate,
        _select_document_type,
        _select_document_no,
        _select_voucher_print_type,
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
