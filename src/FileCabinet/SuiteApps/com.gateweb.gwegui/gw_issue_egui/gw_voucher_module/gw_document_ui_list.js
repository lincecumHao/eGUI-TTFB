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
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_configure',
], function (
  runtime,
  serverWidget,
  redirect,
  search,
  format,
  stringutility,
  invoiceutility,
  gwconfigure
) {
  var _gw_invoice_detail_search_id = gwconfigure.getGwInvoiceDetailSearchId() //Invoice Detail Search
  var _gw_creditmemo_detail_search_id = gwconfigure.getGwCreditmemoDetailSearchId() //Credit Memo Detail Search

  var invoiceEditScriptId = gwconfigure.getGwInvoiceUIEditScriptId()
  var invoiceEditDeployId = gwconfigure.getGwInvoiceUIEditDeployId()

  var _gw_voucher_properties = gwconfigure.getGwVoucherProperties() //設定檔
   
  //手開發票指定狀態
  var _manual_evidence_status_value = invoiceutility.getManualOpenID()

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
  
  ///////////////////////////////////////////////////////////////////////////////////////////
  function searchInvoice(
    form,
    subListObj,
    subsidiary,
    customerid,
    deptcode,
    classification,
    employee,
    tranid,
    transtartdate,
    tranenddate,
    invoice_status
  ) {
	     
    var _mySearch = search.load({
      id: _gw_invoice_detail_search_id,
    })

    var _filterArray = []
    _filterArray.push(['mainline', search.Operator.IS, true])

    _filterArray.push('and')
    _filterArray.push([
      'custbody_gw_lock_transaction',
      search.Operator.IS,
      false,
    ])

    _filterArray.push('and')
    _filterArray.push(['custbody_gw_is_issue_egui', search.Operator.IS, true])
           
    _filterArray.push('and')
    _filterArray.push(['CUSTBODY_GW_EVIDENCE_ISSUE_STATUS.custrecord_gw_evidence_status_value', search.Operator.IS, _manual_evidence_status_value])
 
     
    if (subsidiary != '') {
	    _filterArray.push('and')
	    _filterArray.push(['subsidiary', search.Operator.ANYOF, subsidiary])
	    //_filterArray.push(['custbody_gw_tax_id_number', search.Operator.IS, subsidiary])
	}

    if (customerid != '') {
      _filterArray.push('and')
      _filterArray.push(['entity', search.Operator.IS, customerid])
    }
    if (deptcode != '') {
      _filterArray.push('and')
      _filterArray.push(['department', search.Operator.IS, deptcode])
    }
    if (classification != '') {
      _filterArray.push('and')
      _filterArray.push(['class', search.Operator.IS, classification])
    }
    if (employee != '') {
      _filterArray.push('and')
      _filterArray.push(['createdby', search.Operator.IS, employee])
    }
    if (tranid != '') {
      _filterArray.push('and')
      _filterArray.push(['tranid', search.Operator.IS, tranid])
    }
    if (transtartdate != '') {
      var _formattedDate = format.format({
        value: transtartdate,
        type: format.Type.DATETIMETZ,
      })

      _filterArray.push('and')
      _filterArray.push(['trandate', search.Operator.ONORAFTER, _formattedDate])
    }
    if (tranenddate != '') {
      var _formattedDate = format.format({
        value: tranenddate,
        type: format.Type.DATETIMETZ,
      })
      _filterArray.push('and')
      _filterArray.push([
        'trandate',
        search.Operator.ONORBEFORE,
        _formattedDate,
      ])
    }
    //////////////////////////////////////////////////////////////////////////
    //20210908 walter add status filter
    if (invoice_status.length !=0) {    
	    var _status_ary = []
	    //Invoice 
	    _status_ary.push(invoice_status)   
	    _filterArray.push('and')
	    _filterArray.push(['status', search.Operator.ANYOF, _status_ary])    	      
    }    
    //////////////////////////////////////////////////////////////////////////
    
    _mySearch.filterExpression = _filterArray
    log.debug('invoice filterArray', JSON.stringify(_filterArray))
    ///////////////////////////////////////////////////////////////////////////////////
    //處理結果
    var i = 0
    var _check_id = -1
    _mySearch.run().each(function (result) {
      var _result = JSON.parse(JSON.stringify(result))
      
      log.debug('invoice _result', JSON.stringify(_result))
      
      /**
      var _item_subsidiary;
      if (_result.values.subsidiary.length != 0) {
    	  _item_subsidiary = _result.values.subsidiary[0].value
      } 
      */
      var internalid = _result.id

      var _invoice_status = ''
      if (_result.values.statusref.length != 0) {
        _invoice_status = _result.values.statusref[0].value
      }

      //filter voiided
      if (_check_id != internalid && _invoice_status != 'voided') {
        _check_id = internalid
        var _valueObj = _result.values //object
        subListObj.setSublistValue({
          id: 'customer_search_invoice_id',
          line: i,
          value: internalid,
        })

        var _tranid = _result.values.tranid
        subListObj.setSublistValue({
          id: 'customer_invoice_tranid',
          line: i,
          value: internalid + '-' + _tranid,
        })

        var _status = ''
        if (_result.values.statusref.length != 0) {
          _status = _result.values.statusref[0].value
        }
        subListObj.setSublistValue({
          id: 'customer_invoice_status',
          line: i,
          value: stringutility.trimOrAppendBlank(_status),
        })

        var _tax_id_number = _result.values.custbody_gw_tax_id_number
        subListObj.setSublistValue({
          id: 'customer_invoice_used_businessno',
          line: i,
          value: stringutility.trimOrAppendBlank(_tax_id_number),
        })

        var _entity = ''
        var _entityName = ''
        if (_result.values.entity.length != 0) {
          _entity = _result.values.entity[0].value
          _entityName = _result.values.entity[0].text
        }
        subListObj.setSublistValue({
          id: 'customer_invoice_entity_id',
          line: i,
          value: stringutility.trimOrAppendBlank(_entity),
        })
        subListObj.setSublistValue({
          id: 'customer_invoice_entity',
          line: i,
          value: stringutility.trimOrAppendBlank(_entityName),
        })

        var _trandate = _result.values.trandate
        subListObj.setSublistValue({
          id: 'customer_invoice_trandate',
          line: i,
          value: _trandate,
        })
        var _total = _result.values.amount
        subListObj.setSublistValue({
          id: 'customer_invoice_total',
          line: i,
          value: stringutility.trimOrAppendBlank(_total),
        })

        var _createdby = ''
        var _createdbyName = ''
        if (_result.values.createdby.length != 0) {
          _createdby = _result.values.createdby[0].value
          _createdbyName = _result.values.createdby[0].text
        }
        subListObj.setSublistValue({
          id: 'customer_invoice_createdby',
          line: i,
          value: stringutility.trimOrAppendBlank(_createdbyName),
        })

        var _department = ''
        var _departmentname = ''
        if (_result.values.department.length != 0) {
          _department = _result.values.department[0].value
          _departmentname = _result.values.department[0].text
        }
        if (_departmentname.length != 0) {
          subListObj.setSublistValue({
            id: 'customer_invoice_department',
            line: i,
            value: stringutility.trimOrAppendBlank(_departmentname),
          })
        }
        var _class = ''
        var _classname = ''
        if (_result.values.class.length != 0) {
          _class = _result.values.class[0].value
          _classname = _result.values.class[0].text
        }
        if (_classname.length != 0) {
          subListObj.setSublistValue({
            id: 'customer_invoice_class',
            line: i,
            value: stringutility.trimOrAppendBlank(_class),
          })
        }
        i++
      }
       
      return true
      
      
    })

    ///////////////////////////////////////////////////////////////////////////////////
  }
 
  function searchCreateMemo(
    form,
    subListObj,
    subsidiary,
    customerid,
    deptcode,
    classification,
    employee,
    tranid,
    transtartdate,
    tranenddate,
    creditmemo_status
  ) { 
    var _mySearch = search.load({
      id: _gw_creditmemo_detail_search_id,
    })

    //
    var _filterArray = []
     
    _filterArray.push(['mainline', 'is', true])
    _filterArray.push('and')
    _filterArray.push(['custbody_gw_lock_transaction', 'is', false])
    _filterArray.push('and')
    _filterArray.push(['custbody_gw_is_issue_egui', 'is', true])
    _filterArray.push('and')
    _filterArray.push(['CUSTBODY_GW_EVIDENCE_ISSUE_STATUS.custrecord_gw_evidence_status_value', search.Operator.IS, _manual_evidence_status_value])
  
    if (subsidiary != '') {
	    _filterArray.push('and')
	    _filterArray.push(['subsidiary', search.Operator.ANYOF, subsidiary])
	    //_filterArray.push(['custbody_gw_tax_id_number', search.Operator.IS, subsidiary])
	}
    
    if (customerid != '') {
      _filterArray.push('and')
      _filterArray.push(['entity', 'is', customerid])
    }
    if (deptcode != '') {
      _filterArray.push('and')
      _filterArray.push(['department', 'is', deptcode])
    }
    if (classification != '') {
      _filterArray.push('and')
      _filterArray.push(['class', 'is', classification])
    }
    if (employee != '') {
      _filterArray.push('and')
      _filterArray.push(['createdby', 'is', employee])
    }
    if (tranid != '') {
      _filterArray.push('and')
      _filterArray.push(['tranid', 'is', tranid])
    }
    if (transtartdate != '') {
      var _formattedDate = format.format({
        value: transtartdate,
        type: format.Type.DATETIMETZ,
      })

      _filterArray.push('and')
      _filterArray.push(['trandate', 'onorafter', _formattedDate])
    }
    if (tranenddate != '') {
      var _formattedDate = format.format({
        value: tranenddate,
        type: format.Type.DATETIMETZ,
      })
      _filterArray.push('and')
      _filterArray.push(['trandate', 'onorbefore', _formattedDate])
    }
    //////////////////////////////////////////////////////////////////////////
    //20210908 walter add status filter
    if (creditmemo_status.length !=0) { 
	    var _status_ary = []      
	    //Create Memo status list
	    _status_ary.push(creditmemo_status)  
	    _filterArray.push('and')
	    _filterArray.push(['status', search.Operator.ANYOF, _status_ary])   
    }   
    //////////////////////////////////////////////////////////////////////////
    _mySearch.filterExpression = _filterArray
    ///////////////////////////////////////////////////////////////////////////////////

    //處理結果
    var i = 0
    var _check_id = -1
    var _myResultSet = _mySearch.run()
    if (_myResultSet !== null) {
      _mySearch.run().each(function (result) {
        var _result = JSON.parse(JSON.stringify(result))
        log.debug('credit memo _result', JSON.stringify(_result))
        /**
        var _item_subsidiary;
        if (_result.values.subsidiary.length != 0) {
    	    _item_subsidiary = _result.values.subsidiary[0].value
        } 
        */
        var internalid = _result.id

        var _creditmemo_status = ''
        if (_result.values.statusref.length != 0) {
          _creditmemo_status = _result.values.statusref[0].value
        }
        //filter voided
        if (_check_id != internalid && _creditmemo_status != 'voided') {
          _check_id = internalid

          var _valueObj = _result.values //object
          subListObj.setSublistValue({
            id: 'customer_search_creditmemo_id',
            line: i,
            value: internalid,
          })

          var _tranid = _result.values.tranid
          subListObj.setSublistValue({
            id: 'customer_creditmemo_tranid',
            line: i,
            value: internalid + '-' + _tranid,
          })

          var _status = ''
          if (_result.values.statusref.length != 0) {
            _status = _result.values.statusref[0].value
          }
          subListObj.setSublistValue({
            id: 'customer_creditmemo_status',
            line: i,
            value: stringutility.trimOrAppendBlank(_status),
          })

          var _tax_id_number = _result.values.custbody_gw_tax_id_number
          subListObj.setSublistValue({
            id: 'customer_creditmemo_used_businessno',
            line: i,
            value: stringutility.trimOrAppendBlank(_tax_id_number),
          })

          var _entity = ''
          var _entityName = ''
          if (_result.values.entity.length != 0) {
            _entity = _result.values.entity[0].value
            _entityName = _result.values.entity[0].text
          }
          subListObj.setSublistValue({
            id: 'customer_creditmemo_entity_id',
            line: i,
            value: stringutility.trimOrAppendBlank(_entity),
          })
          subListObj.setSublistValue({
            id: 'customer_creditmemo_entity',
            line: i,
            value: stringutility.trimOrAppendBlank(_entityName),
          })

          var _trandate = _result.values.trandate
          subListObj.setSublistValue({
            id: 'customer_creditmemo_trandate',
            line: i,
            value: _trandate,
          })
          var _total = _result.values.amount
          subListObj.setSublistValue({
            id: 'customer_creditmemo_total',
            line: i,
            value: stringutility.trimOrAppendBlank(_total),
          })

          var _createdby = ''
          var _createdbyName = ''
          if (_result.values.createdby.length != 0) {
            _createdby = _result.values.createdby[0].value
            _createdbyName = _result.values.createdby[0].text
          }
          subListObj.setSublistValue({
            id: 'customer_creditmemo_createdby',
            line: i,
            value: stringutility.trimOrAppendBlank(_createdbyName),
          })

          subListObj.setSublistValue({
            id: 'customer_creditmemo_gui_num',
            line: i,
            value: stringutility.trimOrAppendBlank(_result.values.custbody_gw_gui_num_start),
          })

          var _department = ''
          var _departmentname = ''
          if (_result.values.department.length != 0) {
            _department = _result.values.department[0].value
            _departmentname = _result.values.department[0].text
          }
          if (_departmentname.length != 0) {
            subListObj.setSublistValue({
              id: 'customer_creditmemo_department',
              line: i,
              value: stringutility.trimOrAppendBlank(_departmentname),
            })
          }
          var _class = ''
          var _classname = ''
          if (_result.values.class.length != 0) {
            _class = _result.values.class[0].value
            _classname = _result.values.class[0].text
          }
          if (_classname.length != 0) {
            subListObj.setSublistValue({
              id: 'customer_creditmemo_class',
              line: i,
              value: stringutility.trimOrAppendBlank(_class),
            })
          }
          i++
        }
   
        return true
      })
    }
    ///////////////////////////////////////////////////////////////////////////////////
  }
 
  function createForm(form) {
    var _row01_fieldgroupid = form.addFieldGroup({
      id: 'row01_fieldgroupid',
      label: '條件',
    })
    ///////////////////////////////////////////////////////////////////////////////////
    //公司別
    var _selectBusinessNo = form.addField({
      id: 'custpage_businessno',
      type: serverWidget.FieldType.SELECT,
      label: '統一編號',
      container: 'row01_fieldgroupid',
    })
    _selectBusinessNo.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
    })
    ///////////////////////////////////////////////////////////////////////////////////
    //20210427 walter 增加賣方公司 List
    var currentUserObject = runtime.getCurrentUser()
    var _company_ary = invoiceutility.getBusinessEntitByUserId(currentUserObject)
    if (_company_ary !== null) {
    	for (var i = 0; i < _company_ary.length; i++) {
    		var eachCompanyObject = _company_ary[i];
            log.debug({title: 'createForm - eachCompanyObject', details: JSON.stringify(eachCompanyObject)})
    		_selectBusinessNo.addSelectOption({
    	          value: eachCompanyObject.subsidiary + '-' + eachCompanyObject.tax_id_number,
    	          text: eachCompanyObject.tax_id_number + '-' + eachCompanyObject.be_gui_title,
            })
    	}
    }
    //////////////////////////////////////////////////////////////////////////////////
    //客戶代碼
    var _selectCustomerCode = form.addField({
      id: 'custpage_selectcustomerid',
      type: serverWidget.FieldType.SELECT,
      label: '買方公司',
      source: 'customer',
      container: 'row01_fieldgroupid',
    })

    _selectCustomerCode.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
    })
    _selectCustomerCode.updateDisplaySize({
      height: _field_height,
      width: _field_width,
    })

    //部門代碼
    var _selectDeptCode = form.addField({
      id: 'custpage_select_deptcode',
      type: serverWidget.FieldType.SELECT,
      label: '發票部門',
      container: 'row01_fieldgroupid',
    })
    _selectDeptCode.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectDeptCode.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
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
      container: 'row01_fieldgroupid',
    })
    _selectClassification.addSelectOption({
      value: '',
      text: 'NONE',
    })
    _selectClassification.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
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
    ///////////////////////////////////////////////////////////////////////////////
    var _selectEmployee = form.addField({
      id: 'custpage_select_employee',
      type: serverWidget.FieldType.SELECT,
      label: '處理人員',
      source: 'employee',
      container: 'row01_fieldgroupid',
    })
    _selectEmployee.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEABOVE,
    })
    _selectEmployee.updateDisplaySize({
      height: _field_height,
      width: _field_width,
    })
    /**
       _selectEmployee.addSelectOption({
				value: '',
				text: 'NONE'
			});
       var _employeeSearch = search.create({
				type: search.Type.EMPLOYEE,				
				columns: ['entityid', 'firstname']
			}).run().each(function(result) {
				var _internalid = result.id;	
				var _entityid = result.getValue({
					name: 'entityid'
				});
				var _name = result.getValue({
					name: 'firstname'
				});		 

				_selectEmployee.addSelectOption({
					value: _internalid,
					text: _entityid
				});         
				return true;
			});
       */
    ///////////////////////////////////////////////////////////////////////////////
    //Invoice單據號碼
    var _invoice_tranid = form.addField({
      id: 'custpage_select_invoice_tranid',
      type: serverWidget.FieldType.TEXT,
      label: 'NS Invoice #',
      container: 'row01_fieldgroupid',
    })
    _invoice_tranid.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _invoice_tranid.updateDisplaySize({
      height: _field_height,
      width: _field_text_width,
    })
    //CreditMemo單據號碼
    var _creditmemo_tranid = form.addField({
      id: 'custpage_select_creditmemo_tranid',
      type: serverWidget.FieldType.TEXT,
      label: 'NS Credit Memo #',
      container: 'row01_fieldgroupid',
    })
    _creditmemo_tranid.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _creditmemo_tranid.updateDisplaySize({
      height: _field_height,
      width: _field_text_width,
    })
    /////////////////////////////////////////////////////////////////////////
    //Invoice
    var _selectInvoiceStatus = form.addField({
      id: 'custpage_invoice_status',
      type: serverWidget.FieldType.SELECT,
      label: 'Invoice 狀態',
      container: 'row01_fieldgroupid',
    })
    _selectInvoiceStatus.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _selectInvoiceStatus.addSelectOption({
      value: '',
      text: 'None',
    })
    _selectInvoiceStatus.addSelectOption({
      value: 'CustInvc:A',
      text: 'Open',
    })
    _selectInvoiceStatus.addSelectOption({
      value: 'CustInvc:B',
      text: 'Paid In Full',
    })
    _selectInvoiceStatus.addSelectOption({
      value: 'CustInvc:C',
      text: 'Pending Approval',
    })
    _selectInvoiceStatus.addSelectOption({
      value: 'CustInvc:D',
      text: 'Rejected',
    })    
    _selectInvoiceStatus.defaultValue = 'CustInvc:A'
    ////////////////////////////////////////////////////////////////////////
	/////////////////////////////////////////////////////////////////////////
    //Credit Memo
    var _selectCreditMemoStatus = form.addField({
      id: 'custpage_creditmemo_status',
      type: serverWidget.FieldType.SELECT,
      label: 'Credit Memo 狀態',
      container: 'row01_fieldgroupid',
    })
    _selectCreditMemoStatus.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _selectCreditMemoStatus.addSelectOption({
      value: '',
      text: 'None',
    })
    _selectCreditMemoStatus.addSelectOption({
      value: 'CustCred:A',
      text: 'Open',
    })
    _selectCreditMemoStatus.addSelectOption({
      value: 'CustCred:B',
      text: 'Fully Applied',
    }) 
    _selectCreditMemoStatus.defaultValue = 'CustCred:A'
    ////////////////////////////////////////////////////////////////////////
    //單據日期
    var _tran_start_date = form.addField({
      id: 'custpage_select_transtartdate',
      type: serverWidget.FieldType.DATE,
      label: '開始日期',
      container: 'row01_fieldgroupid',
    })
    _tran_start_date.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _tran_start_date.updateDisplaySize({
      height: _field_height,
      width: _field_width,
    })

    var _tran_end_date = form.addField({
      id: 'custpage_select_tranenddate',
      type: serverWidget.FieldType.DATE,
      label: '結束日期',
      container: 'row01_fieldgroupid',
    })
    _tran_end_date.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDEBELOW,
    })
    _tran_end_date.updateDisplaySize({
      height: _field_height,
      width: _field_width,
    })
    ///////////////////////////////////////////////////////////////////////////////////////
    var _row02_fieldgroupid = form.addFieldGroup({
      id: 'row02_fieldgroupid',
      label: '批次開立-電子發票開立條件',
    })
    //發票類別
    var _selectInvoiceType = form.addField({
      id: 'custpage_select_invoicetype',
      type: serverWidget.FieldType.SELECT,
      label: '發票格式',
      container: 'row02_fieldgroupid',
    })
    _selectInvoiceType.addSelectOption({
      value: '07',
      text: '一般稅率發票',
    })
    /**
       _selectInvoiceType.addSelectOption({
				value: '08',
				text: '特種稅率發票'
			});
       */
    _selectInvoiceType.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    //發票資料格式
    var _selectMigType = form.addField({
      id: 'custpage_select_migtype',
      type: serverWidget.FieldType.SELECT,
      label: '存證/交換',
      container: 'row02_fieldgroupid',
    })
    _selectMigType.addSelectOption({
      value: 'B2C',
      text: '存證',
    })
    /**
       _selectMigType.addSelectOption({
				value: 'B2BE',
				text: '交換'
			});
       */
    _selectMigType.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    //發票開立方式
    var _selectVoucherOpenType = form.addField({
      id: 'custpage_select_voucher_open_type',
      type: serverWidget.FieldType.SELECT,
      label: '批次開立選項',
      container: 'row02_fieldgroupid',
    })
    _selectVoucherOpenType.addSelectOption({
      value: 'SINGLE-EGUIANDALLOWANCE-SCHEDULE',
      text: '現開現折',
    })
    _selectVoucherOpenType.addSelectOption({
      value: 'SINGLE-EGUI-SCHEDULE',
      text: '開立發票',
    })
    _selectVoucherOpenType.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    //////////////////////////////////////////////////////////////////////////////////////////////
    //字軌分配條件
    //部門代碼
    var _selectDeptCode = form.addField({
      id: 'custpage_dept_code',
      type: serverWidget.FieldType.SELECT,
      label: '發票部門',
      container: 'row02_fieldgroupid',
    })
    _selectDeptCode.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    _selectDeptCode.addSelectOption({
      value: 'USE_INVOICE',
      text: '使用單據所屬部門',
    })
    _selectDeptCode.addSelectOption({
      value: '',
      text: 'NONE',
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
      id: 'custpage_classification',
      type: serverWidget.FieldType.SELECT,
      label: '發票分類',
      container: 'row02_fieldgroupid',
    })
    _selectClassification.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    _selectClassification.addSelectOption({
      value: 'USE_INVOICE',
      text: '使用單據所屬類別',
    })
    _selectClassification.addSelectOption({
      value: '',
      text: 'NONE',
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

    //是否上傳折讓單
    var _selectUploadType = form.addField({
      id: 'custpage_voucher_upload_type',
      type: serverWidget.FieldType.SELECT,
      label: '是否上傳',
      container: 'row02_fieldgroupid',
    })
    ////////////////////////////////////////////////////////////////
    //20210203 walter
    //只傳 EGUI
    _selectUploadType.addSelectOption({
      value: 'EGUI',
      text: '不上傳-折讓單',
    })
    //都不傳 NONE
    _selectUploadType.addSelectOption({
      value: 'NONE',
      text: '不上傳-發票及折讓單',
    })
    //只傳 ALLOWANCE
    _selectUploadType.addSelectOption({
      value: 'ALLOWANCE',
      text: '不上傳-發票',
    })
    //都要傳 ALL
    _selectUploadType.addSelectOption({
      value: 'ALL',
      text: '上傳-發票及折讓單',
    })
    ////////////////////////////////////////////////////////////////
    _selectUploadType.updateLayoutType({
      layoutType: serverWidget.FieldLayoutType.OUTSIDE,
    })
    //////////////////////////////////////////////////////////////////////////////////////////////
  }

  //發票明細
  function createInvoiceSubList(form) {
    var _sublist = form.addSublist({
      id: 'invoicesublistid',
      type: serverWidget.SublistType.LIST,
      label: 'NS Invoice 清單',
    })
    //_sublist.addMarkAllButtons();
    _sublist.addButton({
      id: 'buttonid_mark',
      label: 'Mark All',
      functionName:
        'mark(true,"invoicesublistid","customer_search_invoice_id","customer_search_invoice_check_id")',
    })

    _sublist.addButton({
      id: 'buttonid_unmark',
      label: 'Unmark All',
      functionName:
        'mark(false,"invoicesublistid","customer_search_invoice_id","customer_search_invoice_check_id")',
    })
    /////////////////////////////////////////////////////////////////////////////
    //access check box
    var _idField = _sublist.addField({
      id: 'customer_search_invoice_id',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT,
    })
    _idField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    var _checkboxfield = _sublist.addField({
      id: 'customer_search_invoice_check_id',
      type: serverWidget.FieldType.CHECKBOX,
      label: 'SELECT',
    })
    _checkboxfield.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY,
    })
    /////////////////////////////////////////////////////////////////////////////
    //處理顯示欄位
    _sublist.addField({
      id: 'customer_invoice_tranid',
      type: serverWidget.FieldType.TEXT,
      label: 'NS Invoice #',
    })
    _sublist.addField({
      id: 'customer_invoice_status',
      type: serverWidget.FieldType.TEXT,
      label: '狀態',
    })
    var _entityIdField = _sublist.addField({
      id: 'customer_invoice_entity_id',
      label: '買方公司 ID',
      type: serverWidget.FieldType.TEXT,
    })
    _entityIdField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    _sublist.addField({
      id: 'customer_invoice_entity',
      type: serverWidget.FieldType.TEXT,
      label: '買方公司',
    })
    _sublist.addField({
      id: 'customer_invoice_used_businessno',
      type: serverWidget.FieldType.TEXT,
      label: '開立統編',
    })
    _sublist.addField({
      id: 'customer_invoice_department',
      type: serverWidget.FieldType.TEXT,
      label: '發票部門',
    })
    _sublist.addField({
      id: 'customer_invoice_class',
      type: serverWidget.FieldType.TEXT,
      label: '發票分類',
    })
    _sublist.addField({
      id: 'customer_invoice_trandate',
      type: serverWidget.FieldType.TEXT,
      label: '日期',
    })
    _sublist.addField({
      id: 'customer_invoice_total',
      type: serverWidget.FieldType.TEXT,
      label: '總計(含稅)',
    })
    _sublist.addField({
      id: 'customer_invoice_createdby',
      type: serverWidget.FieldType.TEXT,
      label: '處理人員',
    })
    ////////////////////////////////////////////////////////////////////////////////////////////
    return _sublist
  }

  function createCreditMemoSubList(form) {
    var _sublist = form.addSublist({
      id: 'creditmemosublistid',
      type: serverWidget.SublistType.LIST,
      label: 'NS Credit Memo 清單',
    })
    //sublist.addMarkAllButtons();
    _sublist.addButton({
      id: 'buttonid_mark',
      label: 'Mark All',
      functionName:
        'mark(true,"creditmemosublistid","customer_search_creditmemo_id","customer_search_creditmemo_check_id")',
    })

    _sublist.addButton({
      id: 'buttonid_unmark',
      label: 'Unmark All',
      functionName:
        'mark(false,"creditmemosublistid","customer_search_creditmemo_id","customer_search_creditmemo_check_id")',
    })
    /////////////////////////////////////////////////////////////////////////////
    //access check box
    var _idField = _sublist.addField({
      id: 'customer_search_creditmemo_id',
      label: 'Internal ID',
      type: serverWidget.FieldType.TEXT,
    })
    _idField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })

    var _checkboxfield = _sublist.addField({
      id: 'customer_search_creditmemo_check_id',
      type: serverWidget.FieldType.CHECKBOX,
      label: 'SELECT',
    })
    _checkboxfield.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.ENTRY,
    })
    /////////////////////////////////////////////////////////////////////////////
    //處理顯示欄位
    _sublist.addField({
      id: 'customer_creditmemo_tranid',
      type: serverWidget.FieldType.TEXT,
      label: 'NS Credit Memo #',
    })
    _sublist.addField({
      id: 'customer_creditmemo_status',
      type: serverWidget.FieldType.TEXT,
      label: '狀態',
    })
    var _entityIdField = _sublist.addField({
      id: 'customer_creditmemo_entity_id',
      label: '買方公司 ID',
      type: serverWidget.FieldType.TEXT,
    })
    _entityIdField.updateDisplayType({
      displayType: serverWidget.FieldDisplayType.HIDDEN,
    })
    _sublist.addField({
      id: 'customer_creditmemo_entity',
      type: serverWidget.FieldType.TEXT,
      label: '買方公司',
    })
    _sublist.addField({
      id: 'customer_creditmemo_used_businessno',
      type: serverWidget.FieldType.TEXT,
      label: '開立統編',
    })
    _sublist.addField({
      id: 'customer_creditmemo_department',
      type: serverWidget.FieldType.TEXT,
      label: '發票部門',
    })
    _sublist.addField({
      id: 'customer_creditmemo_class',
      type: serverWidget.FieldType.TEXT,
      label: '發票分類',
    })
    _sublist.addField({
      id: 'customer_creditmemo_trandate',
      type: serverWidget.FieldType.TEXT,
      label: '日期',
    })
    _sublist.addField({
      id: 'customer_creditmemo_total',
      type: serverWidget.FieldType.TEXT,
      label: '總計(含稅)',
    })
    _sublist.addField({
      id: 'customer_creditmemo_createdby',
      type: serverWidget.FieldType.TEXT,
      label: '處理人員',
    })
    _sublist.addField({
      id: 'customer_creditmemo_gui_num',
      type: serverWidget.FieldType.TEXT,
      label: '發票號碼',
    })
    ////////////////////////////////////////////////////////////////////////////////////////////
    return _sublist
  }

  function onRequest(context) {
    ////////////////////////////////////////////////////////////////////////////
    var form = serverWidget.createForm({
      title: '電子發票開立作業（憑證查詢）',
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
    var _hidden_invoice_listld = form.addField({
      id: 'custpage_invoice_hiddent_listid',
      type: serverWidget.FieldType.TEXT,
      label: 'HIDDEN',
    })
    _hidden_invoice_listld.updateDisplayType({
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
    form.addButton({
      id: 'custpage_batch_document_button',
      label: '批次開立',
      functionName: 'submitBatchProcess()',
    })
    form.addButton({
      id: 'custpage_save_document_button',
      label: '單張開立',
      functionName: 'submitSelected()',
    })
    form.addButton({
      id: 'custpage_search_document_button',
      label: '查詢',
      functionName: 'searchResults()',
    })

    createForm(form)
    var _invoiceSubList = createInvoiceSubList(form)
    var _creditMemoSubList = createCreditMemoSubList(form)

    form.clientScriptModulePath = './gw_document_ui_event.js'
    context.response.writePage(form)

    if (context.request.method === 'POST') {
      //Open Document
      var _select_business_parameters =
            context.request.parameters.custpage_businessno    
      var _parameters_ary = _select_business_parameters.split('-');
            
      var _select_subsidiary =_parameters_ary[0];   
      var _select_businessno =_parameters_ary[1];   
            
      var _buttonType = context.request.parameters.custpage_hiddent_buttontype
      var _invoice_hiddent_listId =
        context.request.parameters.custpage_invoice_hiddent_listid
      var _creditmemo_hiddent_listid =
        context.request.parameters.custpage_creditmemo_hiddent_listid

      var _arrParams = {
        custpage_businessno: _select_businessno,
        invoice_hiddent_listid: _invoice_hiddent_listId,
        creditmemo_hiddent_listid: _creditmemo_hiddent_listid,
      }

      //處理開立發票
      if (_buttonType === 'GUIDOCUMENT' || _buttonType === 'ALLOWANCE') {
        redirect.toSuitelet({
          scriptId: invoiceEditScriptId,
          deploymentId: invoiceEditDeployId,
          parameters: _arrParams,
        })
      }

      //search 
      var _selectcustomerid =
        context.request.parameters.custpage_selectcustomerid
      var _select_deptcode = context.request.parameters.custpage_select_deptcode
      var _select_classification =
        context.request.parameters.custpage_select_classification
      var _select_employee = context.request.parameters.custpage_select_employee
      var _select_invoice_tranid =
        context.request.parameters.custpage_select_invoice_tranid
      var _select_creditmemo_tranid =
        context.request.parameters.custpage_select_creditmemo_tranid
      var _select_transtartdate =
        context.request.parameters.custpage_select_transtartdate
      var _select_tranenddate =
        context.request.parameters.custpage_select_tranenddate

      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //20210908 walter add column
      var _invoice_status = context.request.parameters.custpage_invoice_status
      var _creditmemo_status = context.request.parameters.custpage_creditmemo_status
      var _invoiceStatusField = form.getField({
          id: 'custpage_invoice_status',
      })
      _invoiceStatusField.defaultValue = _invoice_status
      var _creditMemoStatusField = form.getField({
          id: 'custpage_creditmemo_status',
      })
      _creditMemoStatusField.defaultValue = _creditmemo_status  
      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      if(!_select_business_parameters) return
      var _businessnoField = form.getField({
        id: 'custpage_businessno',
      })
      _businessnoField.defaultValue = _select_business_parameters
          
      var _customeridField = form.getField({
        id: 'custpage_selectcustomerid',
      })
      _customeridField.defaultValue = _selectcustomerid
      var _deptcodeField = form.getField({
        id: 'custpage_select_deptcode',
      })
      _deptcodeField.defaultValue = _select_deptcode
      var _classificationField = form.getField({
        id: 'custpage_select_classification',
      })
      _classificationField.defaultValue = _select_classification

      var _employeeField = form.getField({
        id: 'custpage_select_employee',
      })
      _employeeField.defaultValue = _select_employee

      var _invoiceTranidField = form.getField({
        id: 'custpage_select_invoice_tranid',
      })
      _invoiceTranidField.defaultValue = _select_invoice_tranid
      var _creditmemoTranidField = form.getField({
        id: 'custpage_select_creditmemo_tranid',
      })
      _creditmemoTranidField.defaultValue = _select_creditmemo_tranid

      var _transtartdateField = form.getField({
        id: 'custpage_select_transtartdate',
      })
      _transtartdateField.defaultValue = _select_transtartdate
      var _tranenddateField = form.getField({
        id: 'custpage_select_tranenddate',
      })
      _tranenddateField.defaultValue = _select_tranenddate
      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

      //1.Get Invoice LIST _invoiceSubList
      searchInvoice(
        form,
        _invoiceSubList,
        _select_subsidiary,
        _selectcustomerid,        
        _select_deptcode,
        _select_classification,
        _select_employee,
        _select_invoice_tranid,
        _select_transtartdate,
        _select_tranenddate,
        _invoice_status
      )
      //2.Get Credit Memo LIST
      searchCreateMemo(
        form,
        _creditMemoSubList,
        _select_subsidiary,
        _selectcustomerid,
        _select_deptcode,
        _select_classification,
        _select_employee,
        _select_creditmemo_tranid,
        _select_transtartdate,
        _select_tranenddate,
        _creditmemo_status
      )

      //search result end
      //end access file
    }
  } //End onRequest

  return {
    onRequest: onRequest,
  }
})