/**
 * @NApiVersion 2.1
 * @NScriptType ScheduledScript
 * @NModuleScope Public
 * issue fghtyu456
 */
define([
  'N/runtime',
  'N/config',
  'N/search',
  'N/record',
  'N/format',
  '../gw_common_utility/gw_common_string_utility',
  '../gw_common_utility/gw_common_validate_utility',
  '../gw_common_utility/gw_common_invoice_utility',
  '../gw_common_utility/gw_common_date_utility',
  '../gw_common_utility/gw_common_configure',
  '../gw_common_utility/gw_syncegui_to_document_utility',
  '../../gw_dao/taxType/gw_dao_tax_type_21',
  '../../gw_dao/docFormat/gw_dao_doc_format_21',
  '../../gw_dao/carrierType/gw_dao_carrier_type_21',
  '../../gw_dao/settings/gw_dao_egui_config'
], function (
  runtime,
  config,
  search,
  record,
  format,
  stringutility,
  validate,
  invoiceutility,
  dateutility,
  gwconfigure,
  synceguidocument,
  taxyype21,
  doc_format_21,
  carriertypedao,
  gwDaoEguiConfig
) {
  var _invoceFormatCode = gwconfigure.getGwVoucherFormatInvoiceCode()
  var _creditMemoFormatCode = gwconfigure.getGwVoucherFormatAllowanceCode()

  var _voucher_main_record = gwconfigure.getGwVoucherMainRecord()
  var _voucher_details_record = gwconfigure.getGwVoucherDetailsRecord()

  var _defaultAccountName = gwconfigure.getGwSearchAccountName() //54
  var _defaultARAccount = gwconfigure.getGwInvoiceEditDefaultAccount() //54
  var _defaultAPAccount = gwconfigure.getGwCreditMemoEditDefaultAccount() //54
  var _voucher_apply_list_record = gwconfigure.getGwVoucherApplyListRecord()
  var _gw_invoice_detail_search_id = gwconfigure.getGwInvoiceDetailSearchId() //Invoice Detail Search
  var _gw_creditmemo_detail_search_id = gwconfigure.getGwCreditmemoDetailSearchId() //Credit Memo Detail Search

  var _gwDepositVoucherRecordId = gwconfigure.getGwDepositVoucherRecord()

  //稅別代碼
  var _withTaxID = gwconfigure.getGwWithTaxID() //1=應稅 [5]
  var _zeroTaxID = gwconfigure.getGwZeroTaxID() //2=零稅率 [0]
  var _freeTaxID = gwconfigure.getGwFreeTaxID() //3=免稅 [0]
  var _speicalTaxID = gwconfigure.getSpeicalTaxID() //4=特種稅率 [1, 2, 5, 15, 25]
  var _mixTaxID = gwconfigure.getGwMixTaxID() //9=混合稅率(B2C) [0]
  var _numericToFixed = gwconfigure.getGwNumericToFixed() //小數點位數

  var _default_upload_status = 'A' //A->P->C,E
  var _invoce_control_field_id = gwconfigure.getInvoceControlFieldId()
  var _invoce_control_field_value = gwconfigure.lockInvoceControlFieldId()
  var _creditmemo_control_field_id = gwconfigure.getCredMemoControlFieldId()
  var _creditmemo_unlock_control_field_value = gwconfigure.unLockCredMemoControlFieldId()

  var _default_customs_clearance_mark = '1' //1:經海關 , 2:不經海關
  var _gw_voucher_properties = gwconfigure.getGwVoucherProperties() //設定檔

  //回寫NS Invoice的發票資料
  var _gw_gui_num_start_field = 'custbody_gw_gui_num_start'
  var _gw_gui_num_end_field = 'custbody_gw_gui_num_end'
  var _gw_allowance_num_start_field = 'custbody_gw_allowance_num_start'
  var _gw_allowance_num_end_field = 'custbody_gw_allowance_num_end'
  var _deduction_egui_number_field = 'custbody_gw_creditmemo_deduction_list'

  var _allowance_pre_code = ''
  
  //商品名稱欄位
  var _ns_item_name_field = '' //invoiceutility.getConfigureValue('ITEM_GROUP', 'ITEM_NAME_FIELD')
	  
  //手開發票指定狀態
  var _manual_evidence_status_value = invoiceutility.getManualOpenID()

  //放公司基本資料
  var _companyObjAry = []
  var _taxObjAry = []
  //營業人資料
  var _seller_comapny_ary = [];

  //放期別資料
  var _apply_period_options_ary = []
  //EGUI
  var _egui_gw_dm_mig_type = 1
  //ALLOWANCE
  var _allowance_gw_dm_mig_type = 4
  ////////////////////////////////////////////////////////////////////////////////////////////////////////
  //1.取得稅別資料
  function loadAllTaxInformation() {
    try {
	  var _all_tax_types = taxyype21.getAll()
	  log.debug('get all_tax_types', JSON.stringify(_all_tax_types))
 
	  for (var i=0; i<_all_tax_types.length; i++) {
		   var _tax_json_obj = _all_tax_types[i]
		   var _ns_tax_json_obj = _tax_json_obj.taxCodes
		   log.debug('get _ns_tax_json_obj', JSON.stringify(_ns_tax_json_obj))
		   var _netsuite_id_value = ''
		   var _netsuite_id_text = ''
		   if (_ns_tax_json_obj.length != 0) {
              _netsuite_id_value = _ns_tax_json_obj.value //111;
              _netsuite_id_text = _ns_tax_json_obj.text //Jul 2020;
           }
		   
		   var _obj = {
			  voucher_property_id: _tax_json_obj.name, //TAX_WITH_TAX
			  voucher_property_value: _tax_json_obj.value, //1
			  voucher_property_note: _tax_json_obj.text, //應稅
			  netsuite_id_value: _netsuite_id_value, //8(NS internalID)
			  netsuite_id_text: _netsuite_id_text,   //VAT_TW TAX 5%-TW(NS Text)
		   }

		   _taxObjAry.push(_obj)
		   
	  } 
    } catch (e) {
      log.error(e.name, e.message)
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
      log.error(e.name, e.message)
    }

    return _taxObj
  }
  
  //////////////////////////////////////////////////////////////////////////////////////////////
  var _carry_type_ary = []
  function loadAllCarryTypeInfo() {
    try {
		  var _all_carry_types = carriertypedao.getAll()
		  log.debug('get all_carry_types', JSON.stringify(_all_carry_types))
	 
		  for (var i=0; i<_all_carry_types.length; i++) {
			   var _carry_json_obj = _all_carry_types[i]
			   var _carry_id = _carry_json_obj.id
			   var _carry_value = _carry_json_obj.value
		 
			   
			   var _obj = {
				  carry_id: _carry_id, //TAX_WITH_TAX
				  carry_value: _carry_value
			   }
	
			   _carry_type_ary.push(_obj)		   
		  } 
    } catch (e) {
      log.error(e.name, e.message)
    }
  }
  //取得載具資料
  function getCarryTypeValue(id) {
    var carry_value = ''
    try {    	 
    	  if (_carry_type_ary == null || _carry_type_ary.length==0)loadAllCarryTypeInfo()
    	  
	      if (_carry_type_ary != null) { 
	         for (var i = 0; i < _carry_type_ary.length; i++) {
	              var _obj = _carry_type_ary[i]
	
	              if (_obj.carry_id == id) {
	        	      carry_value = _obj.carry_value
	                  break
	              }
	         }
	      }
    } catch (e) {
      log.error(e.name, e.message)
    }

    return carry_value
  }

  //轉換成民國年月日(2021/01/18)
  function convertExportDate(export_date) {
    var _tradition_date = '' //民國年月日(1101231)
    log.debug('export_date', export_date)
    try {
      if (export_date.toString().length != 0) {
        export_date = export_date.replace('/', '')
        export_date = export_date.replace('/', '')

        _tradition_date = parseInt(export_date - 19110000).toString()
      }
    } catch (e) {
      log.error(e.name, e.message)
    }

    return _tradition_date
  }

  //20201230 walter modify
  function getApplyPeriodOptions(year_month) {
    var _internal_id = -1
    try {
      var _exist_flag = false
      if (_apply_period_options_ary != null) {
        for (var i = 0; i < _apply_period_options_ary.length; i++) {
          var _obj = _apply_period_options_ary[i]

          if (parseInt(_obj.year_month) == parseInt(year_month)) {
            _exist_flag = true
            _internal_id = _obj.internal_id
            break
          }
        }
      }
      if (_exist_flag == false) {
        _internal_id = invoiceutility.getApplyPeriodOptionId(year_month)
        var _obj = {
          year_month: year_month,
          internal_id: _internal_id,
        }
        _apply_period_options_ary.push(_obj)
      }
    } catch (e) {
      log.error(e.name, e.message)
    }

    return _internal_id
  }

  //取得會計科目
  function getNSInvoiceAccount(_egui_tax_id) {   
	 return _taxObjAry.filter(function (_obj) {
	      return _obj.voucher_property_value.toString() === _egui_tax_id.toString()
	 })[0].netsuite_id_value 
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //取得當地時間
  function getLocalDate() {
    var _date = new Date()
    var _dateString = format.format({
      value: _date,
      type: format.Type.DATETIME,
      timezone: format.Timezone.ASIA_TAIPEI,
    })
    //2020-08-18 13:29:44
    return _dateString
  }

  //取得日期=20200709
  function getCompanyLocatDate() {
    var _dateString = getLocalDate()
    var _date = _dateString.slice(0, 10).replace(/\//g, '')

    return _date
  }

  //取得時間=09:10:25
  function getCompanyLocatTime() {
    var _date = new Date()

    var _hours = _date.getHours()
    if (_hours < 10) {
      _hours = '0' + _hours
    }
    var _minutes = _date.getMinutes()
    if (_minutes < 10) {
      _minutes = '0' + _minutes
    }
    var _seconds = _date.getSeconds()
    if (_seconds < 10) {
      _seconds = '0' + _seconds
    }

    var _time = _hours + ':' + _minutes + ':' + _seconds

    return _time
  }
  
  function getCompanyLocatTime_CANCEL() {
    var _dateString = getLocalDate()
    var _time = _dateString.slice(11, 20).replace('/', '')
    var _ary = _time.split(':')
    if (_ary[0].length == 1) {
      _ary[0] = '0' + _ary[0]
    }

    _time = _ary[0] + ':' + _ary[1] + ':' + _ary[2]

    return _time
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //處理NS Invoice資料-START
  //1.取得Invoice ID Apply List
  function getVoucherSingleScheduleToDoList() {
    var _incoiceIdjAry = []
    try {
      var _mySearch = search.create({
        type: _voucher_apply_list_record,
        columns: [
          search.createColumn({ name: 'internalid' }),
          search.createColumn({ name: 'custrecord_gw_voucher_open_type' }),
          search.createColumn({
            name: 'custrecord_gw_voucher_apply_invoice_type',
          }), //07, 08
          search.createColumn({ name: 'custrecord_gw_voucher_apply_mig_type' }),
          search.createColumn({
            name: 'custrecord_gw_voucher_apply_dept_code',
          }),
          search.createColumn({ name: 'custrecord_gw_voucher_apply_seller' }),
          search.createColumn({ name: 'custrecord_gw_voucher_apply_class' }),
          search.createColumn({ name: 'custrecord_gw_invoice_todo_list' }),
          search.createColumn({ name: 'custrecord_gw_need_upload_mig' }),
          search.createColumn({ name: 'custrecord_gw_invoice_apply_list' }),
          search.createColumn({ name: 'custrecord_gw_voucher_apply_userid' }),
        ],
      })
      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_voucher_apply_type',
        search.Operator.IS,
        'APPLY',
      ])
      _filterArray.push('and')
      _filterArray.push([
        [
          'custrecord_gw_voucher_open_type',
          search.Operator.IS,
          'SINGLE-EGUIANDALLOWANCE-SCHEDULE',
        ],
        'or',
        [
          'custrecord_gw_voucher_open_type',
          search.Operator.IS,
          'SINGLE-EGUI-SCHEDULE',
        ],
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_completed_schedule_task',
        search.Operator.IS,
        'N',
      ])
      _mySearch.filterExpression = _filterArray
      log.debug('_filterArray', JSON.stringify(_filterArray))
      _mySearch.run().each(function (result) {
        var _internalid = result.getValue({
          name: 'internalid',
        })
        var _invoice_type = result.getValue({
          name: 'custrecord_gw_voucher_apply_invoice_type',
        })
        var _mig_type = result.getValue({
          name: 'custrecord_gw_voucher_apply_mig_type',
        })
        var _invoice_apply_list = result.getValue({
          name: 'custrecord_gw_invoice_apply_list',
        })
        var _invoice_todo_list = result.getValue({
          name: 'custrecord_gw_invoice_todo_list',
        })
        var _voucher_open_type = result.getValue({
          name: 'custrecord_gw_voucher_open_type',
        })
        var _voucher_apply_dept_code = result.getValue({
          name: 'custrecord_gw_voucher_apply_dept_code',
        })
        var _voucher_apply_class = result.getValue({
          name: 'custrecord_gw_voucher_apply_class',
        })
        var _need_upload_mig = result.getValue({
          name: 'custrecord_gw_need_upload_mig',
        })
        var _voucher_apply_userid = result.getValue({
          name: 'custrecord_gw_voucher_apply_userid',
        }) 
        var _apply_seller = result.getValue({
            name: 'custrecord_gw_voucher_apply_seller',
          })
        //抓ToDO ID List
        if (stringutility.trim(_invoice_todo_list) !== '') {
          var _obj = {
            internalid: _internalid,
            openType: _voucher_open_type,
            seller: _apply_seller,
            invoiceType: _invoice_type,
            migType: _mig_type,
            applyDeptCode: _voucher_apply_dept_code,
            applyClass: _voucher_apply_class,
            applyId: _invoice_todo_list,
            applyUserId: _voucher_apply_userid,
            needUploadMig: _need_upload_mig,
          }
          _incoiceIdjAry.push(_obj)
        }
        return true
      })
    } catch (e) {
      log.error(e.name, e.message)
    }
    log.debug('_incoiceIdjAry', JSON.stringify(_incoiceIdjAry))
    return _incoiceIdjAry
  }

  function getVoucherInvoiceMainAndDetails(
    mig_type,
    companyInfo,
    internalIdAry
  ) {
    var _jsonObjAry = []

    try {
      /////////////////////////////////////////////////////////////  
      var _mainaddress_text = companyInfo.address 
      var _ban = companyInfo.tax_id_number
      var _legalname = companyInfo.be_gui_title

      ////////////////////////////////////////////////////////////
      //this search is ordered by id, taxrate
      var _nsTaxWithTaxValue = getNSInvoiceAccount('1') //8
      var _nsTaxFreeTaxValue = getNSInvoiceAccount('3')
      var _nsTaxZeroTaxValue = getNSInvoiceAccount('2')
      
      log.debug('_nsTaxWithTaxValue', _nsTaxWithTaxValue)
      log.debug('_nsTaxFreeTaxValue', _nsTaxFreeTaxValue)
      log.debug('_nsTaxZeroTaxValue', _nsTaxZeroTaxValue)

      var _mySearch = search.load({
        id: _gw_invoice_detail_search_id,
      })
      var _filterArray = []
      if (internalIdAry != null) {
        //_filterArray.push('and');
        _filterArray.push(['internalid', search.Operator.ANYOF, internalIdAry])
        ////////////////////////////////////////////////////////////////
        _filterArray.push('and')
        _filterArray.push(['recordtype', search.Operator.IS, 'invoice'])
        //_filterArray.push('and');
        //_filterArray.push(['mainline',search.Operator.IS, false]);
        _filterArray.push('and')
        _filterArray.push(['taxline', search.Operator.IS, false]) //擋稅別科目
        _filterArray.push('and')
        _filterArray.push(['cogs', search.Operator.IS, false]) //擋庫存及成本科目
        //_filterArray.push('and');
        //_filterArray.push(['custbody_gw_lock_transaction',search.Operator.IS, false]); //擋做過的
        //擋做過的
        _filterArray.push('and')
        _filterArray.push([
          'custbody_gw_gui_num_start',
          search.Operator.ISEMPTY,
          '',
        ])
        _filterArray.push('and')
        _filterArray.push([
          'custbody_gw_gui_num_end',
          search.Operator.ISEMPTY,
          '',
        ])
        _filterArray.push('and')
        _filterArray.push([
          'custbody_gw_allowance_num_start',
          search.Operator.ISEMPTY,
          '',
        ])
        _filterArray.push('and')
        _filterArray.push([
          'custbody_gw_allowance_num_end',
          search.Operator.ISEMPTY,
          '',
        ])
        ////////////////////////////////////////////////////////////////

        _mySearch.filterExpression = _filterArray
        log.debug('_filterArray', JSON.stringify(_filterArray))

        var _checkID = ''
        var _mainJsonObj
        var _discountItemJsonObj
        var _amountJsonObj = {
          salesAmount: 0,
          freeSalesAmount: 0,
          zeroSalesAmount: 0,
          taxType: '1',
          taxRate: 0,
          taxAmount: 0,
          totalAmount: 0,
        }

        var _tax1_item_ary = []
        var _tax2_item_ary = []
        var _tax3_item_ary = []
        var _tax9_item_ary = []

        //////////////////////////////////////////
        //應稅項目
        var _tax1_item_amount = 0
        var _tax1_rate1_item_amount = 0
        var _tax1_rate2_item_amount = 0
        var _tax1_rate5_item_amount = 0
        var _tax1_rate15_item_amount = 0
        var _tax1_rate25_item_amount = 0
        //////////////////////////////////////////
        var _tax2_item_amount = 0
        var _tax3_item_amount = 0
        var _tax9_item_amount = 0

        var _sales_order_id = -1
        var _sales_order_number = ''

        var _line_index = 1

        var _existFlag = false
        _mySearch.run().each(function (result) {
          var _result = JSON.parse(JSON.stringify(result))
          log.debug('Invoice Detail Search Result', JSON.stringify(result))
          //1.Main Information
          var _id = _result.id //840
          var _itemtype = _result.values.itemtype //InvtPart or Discount
          var _mainline = _result.values.mainline

          var _account_value = '' //54
          var _account_text = '' //4000 Sales
          if (_result.values.account.length != 0) {
            _account_value = _result.values.account[0].value //54
            _account_text = _result.values.account[0].text //4000 Sales
          }

          /////////////////////////////////////////////////////////////////////////////////////
          if (_mainline != '*' && stringutility.trim(_itemtype) != '') {
            _existFlag = true
            ///////////////////////////////////////////////////////////////////////////////////////////
            //取得資料-START
            var _trandate = _result.values.trandate //2020-07-06
            var _postingperiod_value = '' //111
            var _postingperiod_text = '' //Jul 2020
            if (_result.values.postingperiod.length != 0) {
              _postingperiod_value = _result.values.postingperiod[0].value //111
              _postingperiod_text = _result.values.postingperiod[0].text //Jul 2020
            }
            var _taxperiod_value = '' //111;
            var _taxperiod_text = '' //Jul 2020;
            if (_result.values.taxperiod.length != 0) {
              _taxperiod_value = _result.values.taxperiod[0].value //111;
              _taxperiod_text = _result.values.taxperiod[0].text //Jul 2020;
            }

            var _type_value = '' //CustInvc
            var _type_text = '' //Invoice
            if (_result.values.type.length != 0) {
              _type_value = _result.values.type[0].value //CustInvc
              _type_text = _result.values.type[0].text //Invoice
            }
            var _tranid = _result.values.tranid //AZ10000016 document ID

            var _entity_value = '' //529
            var _entity_text = '' //11 se06_company公司
            if (_result.values.entity.length != 0) {
              _entity_value = _result.values.entity[0].value //529
              _entity_text = _result.values.entity[0].text //11 se06_company公司
            }

            var _amount = stringutility.convertToFloat(_result.values.amount)
			//20210707 walter modify
			if (stringutility.convertToFloat(_result.values.quantity) <0) _amount = -1*_amount
			
            var _linesequencenumber = _result.values.linesequencenumber //1
            //var _line                  = _result.values.line;			    //1

            var _memo = _result.values['memo'] //雅結~~
            //var _item_salesdescription = _result.values['item.salesdescription']
			var _prodcut_id = ''
			var _prodcut_text = ''
			if (_result.values.item.length != 0) {
				_prodcut_id = _result.values.item[0].value //10519
				_prodcut_text = _result.values.item[0].text //NI20200811000099
			}
            var _item_displayname = _result.values[_ns_item_name_field] //新客戶折扣
            if (_ns_item_name_field=='item.displayname') {
            	_item_displayname = _prodcut_text+_item_displayname
            }
            //if (stringutility.trim(_memo) != '') _item_displayname = _memo

            var _item_salestaxcode_value = '' //5
            var _item_salestaxcode_text = _result.values['taxItem.itemid'] //UNDEF-TW

            var _tax_type = '1' //default 應稅
            if (_result.values['taxItem.internalid'].length != 0) {
              _item_salestaxcode_value =
                _result.values['taxItem.internalid'][0].value //5
              var _taxObj = getTaxInformation(_item_salestaxcode_value)
              if (typeof _taxObj !== 'undefined') {
                _tax_type = _taxObj.voucher_property_value
              }
            }

            var _item_internalid_value = ''
            if (_result.values['item.internalid'].length != 0) {
              _item_internalid_value =
                _result.values['item.internalid'][0].value //115
              _item_internalid_text = _result.values['item.internalid'][0].text //115
            }

            var _rate = _result.values.rate //3047.61904762
            var _department_value = ''
            var _department_text = ''
            if (_result.values.department.length != 0) {
              _department_value = _result.values['department'][0].value //1
              _department_text = _result.values['department'][0].text //業務1部
            }

            var _class_value = ''
            var _class_text = ''
            if (_result.values['class'].length != 0) {
              _class_value = _result.values['class'][0].value //1
              _class_text = _result.values['class'][0].text //業務1部
            }

            var _quantity = _result.values.quantity
            //20210909 walter 預設值設為1
            if (_quantity.trim().length==0)_quantity='1'
            	
            var _taxItem_rate = _result.values['taxItem.rate'] //5.00%
            _taxItem_rate = _taxItem_rate.replace('%', '')

            //var _tax_amount            = (stringutility.convertToFloat(_amount) * stringutility.convertToFloat(_taxItem_rate)/100);
            //var _total_amount          = _amount+_tax_amount;
            ////////////////////////////////////////////////////////////////////////////////////////////////////
            //20201110 walter modify
            //NS 的總稅額
            var _ns_total_tax_amount = stringutility.convertToFloat(
              _result.values.taxtotal
            ) //稅額總計 -5.00
            //NS 的總金額小計
            var _ns_total_sum_amount = stringutility.convertToFloat(
              _result.values.total
            ) //金額總計(含稅)
            //NS 的稅額
            var _ns_item_tax_amount = stringutility.convertToFloat(
              _result.values.taxamount
            ) //稅額總計 -5.00
            //NS 的Item金額小計
            var _ns_item_total_amount = stringutility.convertToFloat(
              _result.values.formulacurrency
            ) //Item金額小計
			if (stringutility.convertToFloat(_result.values.quantity) <0) _ns_item_total_amount = -1*_ns_item_total_amount
            ////////////////////////////////////////////////////////////////////////////////////////////////////
            //單位
            var _unitabbreviation = _result.values.unitabbreviation
            ///////////////////////////////////////////////////////////////////////////////////////////////////
            //統編
            //var _customer_vatregnumber = _result.values['customer.vatregnumber'];	//99999997
            var _customer_vatregnumber =
              _result.values.custbody_gw_tax_id_number //99999997
            //買方地址 customer.address
            var _buyer_address = _result.values['customer.address']

            var _companyObj = getCustomerRecord(_customer_vatregnumber)
            /**
			var _email = ''
            if (typeof _companyObj !== 'undefined') {
              _email = _companyObj.email
            }
			*/
			var _email = _result.values['customer.email']
			
            _entity_text = _result.values.custbody_gw_gui_title
            _buyer_address = _result.values.custbody_gw_gui_address

            ///////////////////////////////////////////////////////////////////////////////////////////////////
            var _random_number = invoiceutility.getRandomNum(1000, 9999)
			
            var _gw_gui_main_memo = _result.values.custbody_gw_gui_main_memo //額外備註
            var _gw_item_memo = _result.values.custcol_gw_item_memo //項目備註

            ////////////////////////////////////////////////////////////
            //處理零稅率資訊
            //海關出口單類別
            var _gw_customs_export_category_value = ''
            var _gw_customs_export_category_text = ''
            //適用零稅率規定
            var _gw_applicable_zero_tax_value = ''
            var _gw_applicable_zero_tax_text = ''
            //海關出口號碼
            var _gw_customs_export_no_value = ''
            var _gw_customs_export_no_text = ''
            //輸出或結匯日期
            var _gw_customs_export_date_value = ''
            var _gw_customs_export_date_text = ''
            //通關註記
            var _gw_egui_clearance_mark_value = ''
            var _gw_egui_clearance_mark_text = ''
            //海關出口號碼
            var _gw_customs_export_no = ''
            //輸出或結匯日期
            var _gw_customs_export_date = ''
            if (
              _result.values.custbody_gw_customs_export_category.length != 0
            ) {
              //海關出口單類別
              _gw_customs_export_category_value =
                _result.values.custbody_gw_customs_export_category[0].value //3
              _gw_customs_export_category_text =
                _result.values.custbody_gw_customs_export_category[0].text //D1-課稅區售與或退回保稅倉
              var _temp_ary = _gw_customs_export_category_text.split('-')
              _gw_customs_export_category_text = _temp_ary[0].substr(0, 2)
            }
            if (_result.values.custbody_gw_applicable_zero_tax.length != 0) {
              //適用零稅率規定
              _gw_applicable_zero_tax_value =
                _result.values.custbody_gw_applicable_zero_tax[0].value //5
              _gw_applicable_zero_tax_text =
                _result.values.custbody_gw_applicable_zero_tax[0].text //5-國際間之運輸
              var _temp_ary = _gw_applicable_zero_tax_text.split('-')
              _gw_applicable_zero_tax_text = _temp_ary[0].substr(0, 1)
            }
            if (_result.values.custbody_gw_egui_clearance_mark.length != 0) {
              //通關註記
              _gw_egui_clearance_mark_value =
                _result.values.custbody_gw_egui_clearance_mark[0].value //1
              _gw_egui_clearance_mark_text =
                _result.values.custbody_gw_egui_clearance_mark[0].text //1-經海關
              var _temp_ary = _gw_egui_clearance_mark_text.split('-')
              _gw_egui_clearance_mark_text = _temp_ary[0].substr(0, 1)
            }
            //海關出口號碼 : AA123456789012
            _gw_customs_export_no = _result.values.custbody_gw_customs_export_no
            //輸出或結匯日期 : 2021/01/22
            _gw_customs_export_date = convertExportDate(
              _result.values.custbody_gw_customs_export_date
            )
            log.debug('_gw_customs_export_date', _gw_customs_export_date)
            ///////////////////////////////////////////////////////////////
            /////////////////////////////////////////////////////////////////////////////////////////////////////////
            //載具類別
            var _gw_gui_carrier_type = ''
            if (_result.values.custbody_gw_gui_carrier_type !=null && _result.values.custbody_gw_gui_carrier_type.length != 0) {
		        _gw_gui_carrier_type = getCarryTypeValue(_result.values.custbody_gw_gui_carrier_type[0].value)  
	        } 
			var _gw_gui_carrier_id_1 = _result.values.custbody_gw_gui_carrier_id_1
			var _gw_gui_carrier_id_2 = _result.values.custbody_gw_gui_carrier_id_2
			//捐贈代碼
			var _gw_gui_donation_code = _result.values.custbody_gw_gui_donation_code

            //取得資料-END
            ///////////////////////////////////////////////////////////////////////////////////////////////////////////
            if (_checkID !== '' && _checkID !== _id) {
              //ID
              ///////////////////////////////////////////////////////////////////////////////////////////////////////
              //處理顧客押金-START
              if (_sales_order_id != -1) {
                var _customer_deposit_item_ary = accessCustomerDeposit(
                  _mainJsonObj,
                  _sales_order_id,
                  _line_index,
                  _nsTaxWithTaxValue,
                  _nsTaxFreeTaxValue,
                  _nsTaxZeroTaxValue
                )
                _mainJsonObj.customerDeductionItemAry = _customer_deposit_item_ary
              }
              log.debug(
                'Depost After mainJsonObj Result-1',
                JSON.stringify(_mainJsonObj)
              )
              _sales_order_id = -1
              //處理顧客押金-START
              //Copy Objct and clear Object
              //_mainJsonObj = shareDiscountAmount(_mainJsonObj); //重新計算折扣分攤

              var _cloneMainJsonObj = JSON.parse(JSON.stringify(_mainJsonObj))
              _jsonObjAry.push(_cloneMainJsonObj)

              //clear detail item
              _tax1_item_amount = 0
              _tax1_rate1_item_amount = 0
              _tax1_rate2_item_amount = 0
              _tax1_rate5_item_amount = 0
              _tax1_rate15_item_amount = 0
              _tax1_rate25_item_amount = 0
              //////////////////////////////////////////
              _tax2_item_amount = 0
              _tax3_item_amount = 0
              _tax9_item_amount = 0

              _tax1_item_ary = []
              _tax2_item_ary = []
              _tax3_item_ary = []
              _tax9_item_ary = []
              //clear amount
              _amountJsonObj = {
                salesAmount: 0,
                freeSalesAmount: 0,
                zeroSalesAmount: 0,
                taxType: '1',
                taxRate: 0,
                taxAmount: 0,
                totalAmount: 0,
              }

              _discountItemJsonObj = null
            }
            _checkID = _id

            var _main_tax_type = _tax_type
            if (mig_type == 'B2C') _main_tax_type = '9'
            var _ns_document_type = 'INVOICE'

            //Item
            var _itemJsonObj = {
              description: _item_displayname,
              taxType: _tax_type,
              taxCode: _item_salestaxcode_value,
              taxRate: _taxItem_rate,
              quantity: _quantity,
              unitPrice: _rate,
              itemUnit: _unitabbreviation,
              amount: _amount,
              itemTaxAmount: _ns_item_tax_amount,
              itemTotalAmount: _ns_item_total_amount,
              sequenceNumber: _line_index,
              itemRemark: _gw_item_memo,
              nsDocumentType: _ns_document_type,
              nsDocumentApplyId: _id, //reference
              nsDocumentNumber: _tranid,
              nsDocumentItemId: _item_internalid_value,
              nsDocumentItemSeq: _linesequencenumber,
              itemRelateNumber: _result.values['custcol_gw_item_relate_number'] || ''
            }
            _line_index++

            //discount 不放進來
            if (
               stringutility.trim(_itemtype) != '' 
               //20210908 walter modify => 折扣項目作進Item, 不另外處理
               //&&  stringutility.trim(_itemtype) != 'Discount'
            ) {
              if (_tax_type == '1') {
                _tax1_item_ary.push(_itemJsonObj)
              }

              if (_tax_type == '2') {
                _tax2_item_ary.push(_itemJsonObj)
              }

              if (_tax_type == '3') {
                _tax3_item_ary.push(_itemJsonObj)
              }
            } else if (_itemtype == 'Discount') {
            	//20210908 walter modify => 折扣項目作進Item, 不另外處理
              //紀錄折扣項目
              //_discountItemJsonObj = JSON.parse(JSON.stringify(_itemJsonObj))
              //_discountItemJsonObj.quantity = '1'
              //_discountItemJsonObj.itemUnit = '筆'
            }

            //MAIN Section
            _mainJsonObj = {
              applyId: _id,
              trandate: _trandate,
              sellerIdentifier: _ban,
              sellerName: _legalname,
              sellerAddress: _mainaddress_text,
              buyerId: _entity_value,
              buyerIdentifier: _customer_vatregnumber,
              buyerName: _entity_text,
              buyerEmail: _email,
              buyerAddress: _buyer_address,
              customs_clearance_mark: _gw_egui_clearance_mark_text,
              mig_type: mig_type,              
              carrier_type: _gw_gui_carrier_type,
              carrier_id_1: _gw_gui_carrier_id_1,
              carrier_id_2: _gw_gui_carrier_id_2,
              npo_ban: _gw_gui_donation_code,               
              taxType: _main_tax_type,
              taxRate: stringutility.convertToFloat(_taxItem_rate) / 100,
              department: _department_value,
              classId: _class_value,
              mainRemark: _gw_gui_main_memo,
              applicable_zero_tax: _gw_applicable_zero_tax_text,
              customs_export_category: _gw_customs_export_category_text,
              customs_export_no: _gw_customs_export_no,
              customs_export_date: _gw_customs_export_date,
              tax1ItemAry: _tax1_item_ary,
              tax2ItemAry: _tax2_item_ary,
              tax3ItemAry: _tax3_item_ary,
              tax9ItemAry: _tax9_item_ary,
              customerDeductionItemAry: _tax9_item_ary, //借用
              discountItem: _discountItemJsonObj,
              tax1Amount: _tax1_item_amount,
              tax1Rate1Amount: _tax1_rate1_item_amount,
              tax1Rate2Amount: _tax1_rate2_item_amount,
              tax1Rate5Amount: _tax1_rate5_item_amount,
              tax1Rate15Amount: _tax1_rate15_item_amount,
              tax1Rate25Amount: _tax1_rate25_item_amount,
              tax2Amount: _tax2_item_amount,
              tax3Amount: _tax3_item_amount,
              tax9Amount: _tax9_item_amount,
              amountObj: _amountJsonObj,
            }

            //Amount Section
            _amountJsonObj.taxType = _main_tax_type
            _amountJsonObj.taxRate =
              stringutility.convertToFloat(_taxItem_rate) / 100
            //_amountJsonObj.taxAmount   += stringutility.convertToFloat(_ns_item_tax_amount);
            //20201110 walter modify
            _amountJsonObj.taxAmount = stringutility.convertToFloat(
              _ns_total_tax_amount
            )

            if (_tax_type == '1') {
              //1=應稅 [5]
              _tax1_item_amount += stringutility.convertToFloat(_amount)
              _amountJsonObj.salesAmount += stringutility.convertToFloat(
                _amount
              )
              if (stringutility.convertToFloat(_taxItem_rate) == 1) {
                _tax1_rate1_item_amount += stringutility.convertToFloat(_amount)
              } else if (stringutility.convertToFloat(_taxItem_rate) == 2) {
                _tax1_rate2_item_amount += stringutility.convertToFloat(_amount)
              } else if (stringutility.convertToFloat(_taxItem_rate) == 5) {
                _tax1_rate5_item_amount += stringutility.convertToFloat(_amount)
              } else if (stringutility.convertToFloat(_taxItem_rate) == 15) {
                _tax1_rate15_item_amount += stringutility.convertToFloat(
                  _amount
                )
              } else if (stringutility.convertToFloat(_taxItem_rate) == 25) {
                _tax1_rate25_item_amount += stringutility.convertToFloat(
                  _amount
                )
              }
            } else if (_tax_type == '2') {
              //2=零稅率 [0]
              _tax2_item_amount += stringutility.convertToFloat(_amount)
              _amountJsonObj.zeroSalesAmount += stringutility.convertToFloat(
                _amount
              )
            } else if (_tax_type == '3') {
              //3=免稅 [0]
              _tax3_item_amount += stringutility.convertToFloat(_amount)
              _amountJsonObj.freeSalesAmount += stringutility.convertToFloat(
                _amount
              )
            }

            _mainJsonObj.tax1Amount = _tax1_item_amount
            _mainJsonObj.tax1Rate1Amount = _tax1_rate1_item_amount
            _mainJsonObj.tax1Rate2Amount = _tax1_rate2_item_amount
            _mainJsonObj.tax1Rate5Amount = _tax1_rate5_item_amount
            _mainJsonObj.tax1Rate15Amount = _tax1_rate15_item_amount
            _mainJsonObj.tax1Rate25Amount = _tax1_rate25_item_amount

            _mainJsonObj.tax2Amount = _tax2_item_amount
            _mainJsonObj.tax3Amount = _tax3_item_amount
            /**
               _amountJsonObj.totalAmount = stringutility.convertToFloat(_amountJsonObj.salesAmount)+
               stringutility.convertToFloat(_amountJsonObj.freeSalesAmount)+
               stringutility.convertToFloat(_amountJsonObj.zeroSalesAmount)+
               stringutility.convertToFloat(_amountJsonObj.taxAmount);
               */
            //20201110 walter modify
            _amountJsonObj.totalAmount = stringutility.convertToFloat(
              _ns_total_sum_amount
            )
          } //End IF InvtPart or Discount

          if (_mainline == '*' && _result.values.createdfrom.length != 0) {
            _sales_order_id = _result.values.createdfrom[0].value //633
          }

          return true
        })

        if (_existFlag === true) {
          //有資料就處理
          //處理顧客押金-START
          if (_sales_order_id != -1) {
            var _customer_deposit_item_ary = accessCustomerDeposit(
              _mainJsonObj,
              _sales_order_id,
              _line_index,
              _nsTaxWithTaxValue,
              _nsTaxFreeTaxValue,
              _nsTaxZeroTaxValue
            )
            _mainJsonObj.customerDeductionItemAry = _customer_deposit_item_ary
          }
          log.debug(
            'Depost After mainJsonObj Result-2',
            JSON.stringify(_mainJsonObj)
          )
          _sales_order_id = -1
          //處理顧客押金-START

          //重新計算折扣分攤
          //_mainJsonObj = shareDiscountAmount(_mainJsonObj);
          var _cloneMainJsonObj = JSON.parse(JSON.stringify(_mainJsonObj))
          _jsonObjAry.push(_cloneMainJsonObj)
        }
      }

      log.debug('整理完 INvoice JsonObjAry', JSON.stringify(_jsonObjAry))
    } catch (e) {
      log.error(e.name, e.message)
    }

    return _jsonObjAry
  }

  //處理客戶押金
  function accessCustomerDeposit(
    mainJsonObj,
    sales_order_id,
    line_index,
    nsTaxWithTaxValue,
    nsTaxFreeTaxValue,
    nsTaxZeroTaxValue
  ) {
    var _customer_deposit_item_ary = []
    try {
      var _sales_order_id_ary = []
      _sales_order_id_ary.push(sales_order_id)

      var _jsonObjAry = invoiceutility.getCustomerDepositBalanceAmount(
        _sales_order_id_ary
      )
      if (typeof _jsonObjAry !== 'undefined') {
        for (var i = 0; i < _jsonObjAry.length; i++) {
          var _jsonObj = _jsonObjAry[i]

          var _assign_document_id = _jsonObj.assign_document_id //sales_order_id
          var _sales_order_number = _jsonObj.assign_document_number

          var _tax_type = _jsonObj.tax_type
          var _tax_amount = _jsonObj.tax_amount
          var _amount = _jsonObj.amount
          var _total_amount = _jsonObj.total_amount
          var _dedcuted_amount = _jsonObj.dedcuted_amount //已扣金額

          var _balance_amount = _amount - _dedcuted_amount
          var _deduction_amount = -1 * _balance_amount

          var _tax_rate = 5
          var _ns_tax_code = nsTaxWithTaxValue

          var _has_data = false
          var _amountObj = mainJsonObj.amountObj
          if (_tax_type == '1') {
            //應稅
            _ns_tax_code = nsTaxWithTaxValue
            if (_amountObj.salesAmount != 0) {
              if (_amountObj.salesAmount < Math.abs(_balance_amount)) {
                _deduction_amount = -1 * _amountObj.salesAmount
              }
              _amountObj.salesAmount += _deduction_amount
              _amountObj.taxAmount = _amountObj.salesAmount * 0.05
              _has_data = true
            }
          } else if (_tax_type == '2') {
            //零稅
            _ns_tax_code = nsTaxZeroTaxValue
            _tax_rate = 0
            if (_amountObj.zeroSalesAmount != 0) {
              if (_amountObj.zeroSalesAmount < Math.abs(_balance_amount)) {
                _deduction_amount = -1 * _amountObj.zeroSalesAmount
              }
              _amountObj.zeroSalesAmount += _deduction_amount
              _has_data = true
            }
          } else if (_tax_type == '3') {
            //免稅
            _ns_tax_code = nsTaxFreeTaxValue
            _tax_rate = 0
            if (_amountObj.freeSalesAmount != 0) {
              if (_amountObj.freeSalesAmount < Math.abs(_balance_amount)) {
                _deduction_amount = -1 * _amountObj.freeSalesAmount
              }
              _amountObj.freeSalesAmount += _deduction_amount
              _has_data = true
            }
          }

          _amountObj.totalAmount =
            stringutility.convertToFloat(_amountObj.salesAmount) +
            stringutility.convertToFloat(_amountObj.freeSalesAmount) +
            stringutility.convertToFloat(_amountObj.zeroSalesAmount) +
            stringutility.convertToFloat(_amountObj.taxAmount)

          mainJsonObj.amountObj = _amountObj

          if (_has_data == true) {
            var _deduction_tax_amount = (_deduction_amount * _tax_rate) / 100
            var _deduction_total_amount =
              _deduction_amount + _deduction_tax_amount
            var _itemJsonObj = {
              description: '顧客押金',
              taxType: _tax_type,
              taxCode: _ns_tax_code,
              taxRate: _tax_rate,
              quantity: '1',
              unitPrice: Math.abs(_deduction_amount),
              itemUnit: '筆',
              amount: _deduction_amount,
              itemTaxAmount: _deduction_tax_amount,
              itemTotalAmount: _deduction_total_amount,
              sequenceNumber: line_index,
              itemRemark: '',
              nsDocumentType: 'SALES_ORDER',
              nsDocumentApplyId: _assign_document_id, //reference
              nsDocumentNumber: _sales_order_number,
              nsDocumentItemId: '1',
              nsDocumentItemSeq: '1',
            }
            line_index++
            _customer_deposit_item_ary.push(_itemJsonObj)

            if (_tax_type == '1') {
              //應稅
              mainJsonObj.tax1ItemAry.push(_itemJsonObj)
            } else if (_tax_type == '2') {
              //零稅
              mainJsonObj.tax2ItemAry.push(_itemJsonObj)
            } else if (_tax_type == '3') {
              //免稅
              mainJsonObj.tax3ItemAry.push(_itemJsonObj)
            }

            /////////////////////////////////////////////////////////////////////////////////////////////////////////
            //20201231 walter modify
            //及時處理押金欄位
            searchAndUpdateVoucherDepositDedcutedAmount(
              _assign_document_id,
              _tax_type,
              Math.abs(_deduction_amount)
            )
            /////////////////////////////////////////////////////////////////////////////////////////////////////////
          }
        }
      }
    } catch (e) {
      log.error(e.name, e.message)
    }

    return _customer_deposit_item_ary
  }

  //分攤Discount Amount
  function shareDiscountAmount(mainJsonObj) {
    try {
      log.debug('shareDiscountAmount', JSON.stringify(mainJsonObj))
      /////////////////////////////////////////////////////////////////////////////////
      var _tax1_amount = mainJsonObj.tax1Amount
      var _tax1_rate1_amount = mainJsonObj.tax1Rate1Amount
      var _tax1_rate2_amount = mainJsonObj.tax2Rate1Amount
      var _tax1_rate5_amount = mainJsonObj.tax5Rate1Amount
      var _tax1_rate15_amount = mainJsonObj.tax15Rate1Amount
      var _tax1_rate25_amount = mainJsonObj.tax25Rate1Amount
      /////////////////////////////////////////////////////////////////////////////////
      var _tax2_amount = mainJsonObj.tax2Amount
      var _tax3_amount = mainJsonObj.tax3Amount
      var _tax9_amount = mainJsonObj.tax9Amount

      var _sum_amount = _tax1_amount + _tax2_amount + _tax3_amount
      var _discountItemObj = mainJsonObj.discountItem

      if (
        typeof _discountItemObj !== 'undefined' &&
        _discountItemObj.amount !== null
      ) {
        var _discountAmount = _discountItemObj.amount
        log.debug('_discountAmount', _discountAmount)
        _discountAmount = 0
        if (_discountAmount != 0) {
          //要依稅別分攤[1,2,5,15,25]
          if (_tax1_amount != 0) {
            var _itemAry = mainJsonObj.tax1ItemAry
            var _shareDiscountAmount =
              (_discountAmount * _tax1_amount) / _sum_amount
            ///////////////////////////////////////////////////////////////////////////////
            if (_tax1_rate1_amount != 0) {
              var _clone_rate1_discountObj = JSON.parse(
                JSON.stringify(_discountItemObj)
              )
              var _share_rate1_discountAmount =
                (_shareDiscountAmount * _tax1_rate1_amount) / _tax1_amount
              _clone_rate1_discountObj.amount = _share_rate1_discountAmount

              if (_itemAry != null) {
                for (var i = 0; i < _itemAry.length; i++) {
                  var _itemObj = _itemAry[i]
                  var item_tax_rate = _itemObj.taxRate
                  if (stringutility.convertToFloat(item_tax_rate) == 1) {
                    _clone_rate1_discountObj.taxCode = _itemObj.taxCode
                    _clone_rate1_discountObj.taxRate = _itemObj.taxRate
                    _clone_rate1_discountObj.unitPrice = Math.abs(
                      _clone_rate1_discountObj.amount
                    )
                    break
                  }
                }
              }
              mainJsonObj.tax1ItemAry.push(_clone_rate1_discountObj)
            }
            ///////////////////////////////////////////////////////////////////////////////
            if (_tax1_rate2_amount != 0) {
              var _clone_rate2_discountObj = JSON.parse(
                JSON.stringify(_discountItemObj)
              )
              var _share_rate2_discountAmount =
                (_shareDiscountAmount * _tax1_rate2_amount) / _tax1_amount
              _clone_rate2_discountObj.amount = _share_rate2_discountAmount

              if (_itemAry != null) {
                for (var i = 0; i < _itemAry.length; i++) {
                  var _itemObj = _itemAry[i]
                  var item_tax_rate = _itemObj.taxRate
                  if (stringutility.convertToFloat(item_tax_rate) == 2) {
                    _clone_rate2_discountObj.taxCode = _itemObj.taxCode
                    _clone_rate2_discountObj.taxRate = _itemObj.taxRate
                    _clone_rate2_discountObj.unitPrice = Math.abs(
                      _clone_rate2_discountObj.amount
                    )
                    break
                  }
                }
              }
              mainJsonObj.tax1ItemAry.push(_clone_rate2_discountObj)
            }
            ///////////////////////////////////////////////////////////////////////////////
            if (_tax1_rate5_amount != 0) {
              var _clone_rate5_discountObj = JSON.parse(
                JSON.stringify(_discountItemObj)
              )
              var _share_rate5_discountAmount =
                (_shareDiscountAmount * _tax1_rate5_amount) / _tax1_amount
              _clone_rate5_discountObj.amount = _share_rate5_discountAmount

              if (_itemAry != null) {
                for (var i = 0; i < _itemAry.length; i++) {
                  var _itemObj = _itemAry[i]
                  var item_tax_rate = _itemObj.taxRate
                  if (stringutility.convertToFloat(item_tax_rate) == 5) {
                    _clone_rate5_discountObj.taxCode = _itemObj.taxCode
                    _clone_rate5_discountObj.taxRate = _itemObj.taxRate
                    _clone_rate5_discountObj.unitPrice = Math.abs(
                      _clone_rate5_discountObj.amount
                    )
                    break
                  }
                }
              }
              mainJsonObj.tax1ItemAry.push(_clone_rate5_discountObj)
            }
            ///////////////////////////////////////////////////////////////////////////////
            if (_tax1_rate15_amount != 0) {
              var _clone_rate15_discountObj = JSON.parse(
                JSON.stringify(_discountItemObj)
              )
              var _share_rate15_discountAmount =
                (_shareDiscountAmount * _tax1_rate15_amount) / _tax1_amount
              _clone_rate15_discountObj.amount = _share_rate15_discountAmount

              if (_itemAry != null) {
                for (var i = 0; i < _itemAry.length; i++) {
                  var _itemObj = _itemAry[i]
                  var item_tax_rate = _itemObj.taxRate
                  if (stringutility.convertToFloat(item_tax_rate) == 5) {
                    _clone_rate15_discountObj.taxCode = _itemObj.taxCode
                    _clone_rate15_discountObj.taxRate = _itemObj.taxRate
                    _clone_rate15_discountObj.unitPrice = Math.abs(
                      _clone_rate15_discountObj.amount
                    )
                    break
                  }
                }
              }
              mainJsonObj.tax1ItemAry.push(_clone_rate15_discountObj)
            }
            ///////////////////////////////////////////////////////////////////////////////
            if (_tax1_rate25_amount != 0) {
              var _clone_rate25_discountObj = JSON.parse(
                JSON.stringify(_discountItemObj)
              )
              var _share_rate25_discountAmount =
                (_shareDiscountAmount * _tax1_rate25_amount) / _tax1_amount
              _clone_rate25_discountObj.amount = _share_rate25_discountAmount

              if (_itemAry != null) {
                for (var i = 0; i < _itemAry.length; i++) {
                  var _itemObj = _itemAry[i]
                  var item_tax_rate = _itemObj.taxRate
                  if (stringutility.convertToFloat(item_tax_rate) == 5) {
                    _clone_rate25_discountObj.taxCode = _itemObj.taxCode
                    _clone_rate25_discountObj.taxRate = _itemObj.taxRate
                    _clone_rate25_discountObj.unitPrice = Math.abs(
                      _clone_rate25_discountObj.amount
                    )
                    break
                  }
                }
              }
              mainJsonObj.tax1ItemAry.push(_clone_rate25_discountObj)
            }
            ///////////////////////////////////////////////////////////////////////////////
          }
          if (_tax2_amount != 0) {
            var _cloneDiscountItemJsonObj = JSON.parse(
              JSON.stringify(_discountItemObj)
            )

            var _shareDiscountAmount =
              (_discountAmount * _tax2_amount) / _sum_amount
            _cloneDiscountItemJsonObj.amount = _shareDiscountAmount

            //sync taxcode and tax rate
            var _itemAry = mainJsonObj.tax2ItemAry
            if (_itemAry != null) {
              for (var i = 0; i < _itemAry.length; i++) {
                var _itemObj = _itemAry[i]
                _cloneDiscountItemJsonObj.taxCode = _itemObj.taxCode
                _cloneDiscountItemJsonObj.taxRate = _itemObj.taxRate
                _cloneDiscountItemJsonObj.unitPrice = Math.abs(
                  _cloneDiscountItemJsonObj.amount
                )
                break
              }
            }
            mainJsonObj.tax2ItemAry.push(_cloneDiscountItemJsonObj)
          }
          if (_tax3_amount != 0) {
            var _cloneDiscountItemJsonObj = JSON.parse(
              JSON.stringify(_discountItemObj)
            )

            var _shareDiscountAmount =
              (_discountAmount * _tax3_amount) / _sum_amount
            _cloneDiscountItemJsonObj.amount = _shareDiscountAmount

            //sync taxcode and tax rate
            var _itemAry = mainJsonObj.tax3ItemAry
            if (_itemAry != null) {
              for (var i = 0; i < _itemAry.length; i++) {
                var _itemObj = _itemAry[i]
                _cloneDiscountItemJsonObj.taxCode = _itemObj.taxCode
                _cloneDiscountItemJsonObj.taxRate = _itemObj.taxRate
                _cloneDiscountItemJsonObj.unitPrice = Math.abs(
                  _cloneDiscountItemJsonObj.amount
                )
                break
              }
            }

            mainJsonObj.tax3ItemAry.push(_cloneDiscountItemJsonObj)
          }
        }
      }
    } catch (e) {
      log.error(e.name, e.message)
    }

    return mainJsonObj
  }

  //處理NS Invoice資料-END
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //處理發票資料-START
  //共用功能
  function saveBatchVouchers(
    open_type,
    voucher_type,
    invoice_type,
    mig_type,
    apply_dept_code,
    apply_class,
    internalid,
    jsonObjAry,
    historyInvoiceObjAry,
    need_upload_mig,
    tax_diff_balance,
    apply_user_id
  ) {
    var _completed_Id_ary = []
    try {
      if (jsonObjAry != null) {
        for (var i = 0; i < jsonObjAry.length; i++) {
          var _obj = jsonObjAry[i]
          //SuiteScript 2.0 Scheduled Script Type => 10,000
          //search.load(options) => 5
          //record.create
          //10: for transaction records
          //2: for custom records
          //5: for all other records
          //record.save
          //20: for transaction records
          //4: for custom records
          //10: for all other records
          //save to main and details record
          //B2C=>混合稅率
          //B2B=>分稅別=>單張開立
          if (mig_type == 'B2C') {
            //混合稅率
            //判斷是否為混合稅
            var _b2cMixTaxType = '9'
            var _type1_length = _obj.tax1ItemAry.length != '0' ? '1' : '0'
            var _type2_length = _obj.tax2ItemAry.length != '0' ? '1' : '0'
            var _type3_length = _obj.tax3ItemAry.length != '0' ? '1' : '0'
            var _type_str = _type1_length + _type2_length + _type3_length
            if (_type_str == '100') _b2cMixTaxType = '1'
            else if (_type_str == '010') _b2cMixTaxType = '2'
            else if (_type_str == '001') _b2cMixTaxType = '3'
            //判斷是否為混合稅
            _obj.taxType = _b2cMixTaxType

            var _itemObjAry = []
            for (var a = 0; a < _obj.tax1ItemAry.length; a++) {
              var _itemObj = _obj.tax1ItemAry[a]
              _itemObjAry.push(_itemObj)
            }
            for (var a = 0; a < _obj.tax2ItemAry.length; a++) {
              var _itemObj = _obj.tax2ItemAry[a]
              _itemObjAry.push(_itemObj)
            }
            for (var a = 0; a < _obj.tax3ItemAry.length; a++) {
              var _itemObj = _obj.tax3ItemAry[a]
              _itemObjAry.push(_itemObj)
            }

            resetMainObjectTaxInformation(
              voucher_type,
              invoice_type,
              mig_type,
              apply_dept_code,
              apply_class,
              internalid,
              _obj,
              _itemObjAry,
              historyInvoiceObjAry,
              need_upload_mig,
              tax_diff_balance,
              apply_user_id
            )
          } else {
            resetMainObjectTaxInformation(
              voucher_type,
              invoice_type,
              mig_type,
              apply_dept_code,
              apply_class,
              internalid,
              _obj,
              _obj.tax1ItemAry,
              historyInvoiceObjAry,
              need_upload_mig,
              tax_diff_balance,
              apply_user_id
            )
            resetMainObjectTaxInformation(
              voucher_type,
              invoice_type,
              mig_type,
              apply_dept_code,
              apply_class,
              internalid,
              _obj,
              _obj.tax2ItemAry,
              historyInvoiceObjAry,
              need_upload_mig,
              tax_diff_balance,
              apply_user_id
            )
            resetMainObjectTaxInformation(
              voucher_type,
              invoice_type,
              mig_type,
              apply_dept_code,
              apply_class,
              internalid,
              _obj,
              _obj.tax3ItemAry,
              historyInvoiceObjAry,
              need_upload_mig,
              tax_diff_balance,
              apply_user_id
            )
          }
          var _completed_apply_id = _obj.applyId
          _completed_Id_ary.push(_completed_apply_id)

          ///////////////////////////////////////////////////////////////////////////////////
          //Resource 管控
          var _used_remaining_usage = runtime
            .getCurrentScript()
            .getRemainingUsage()
          if (open_type == 'SINGLE-EGUIANDALLOWANCE-SCHEDULE') {
            //現開現折
            if (voucher_type == 'EGUI' && _used_remaining_usage <= 5000) break
            else if (voucher_type != 'EGUI' && _used_remaining_usage <= 100)
              break
          } else {
            if (_used_remaining_usage <= 100) break
          }
          log.debug('usage', 'used_remaining_usage=' + _used_remaining_usage)
          ///////////////////////////////////////////////////////////////////////////////////
        }
      }
    } catch (e) {
      log.error(e.name, e.message)
    }

    return _completed_Id_ary
  }

  function resetMainObjectTaxInformation(
    voucher_type,
    invoice_type,
    mig_type,
    apply_dept_code,
    apply_class,
    internalid,
    mainObj,
    detail_item_ary,
    historyInvoiceObjAry,
    need_upload_mig,
    tax_diff_balance,
    apply_user_id
  ) {
    try {
      if (detail_item_ary.length != 0) {
        var _newItemAry = []
        //////////////////////////////////////////////////////////////////////////////////////////////////////////
        //1.Main 資料要重設=>找到taxType及taxRate
        var _sum_tax_amount = 0
        var _sum_sales_amount = 0
        var _sum_free_sales_amount = 0
        var _sum_zero_sales_amount = 0
        //重算金額及稅額
        for (var i = 0; i < detail_item_ary.length; i++) {
          var _itemObj = detail_item_ary[i]

          var _tax_code = _itemObj.taxCode
          var _tax_rate = _itemObj.taxRate //5.00
          //var _tax_type = gwconfigure.getGwTaxTypeFromNSTaxCode(stringutility.trim(_tax_code));
          var _taxObj = getTaxInformation(_tax_code)
          var _tax_type = '1'
          if (typeof _taxObj !== 'undefined') {
            _tax_type = _taxObj.voucher_property_value
          }

          //金額要重算
          if (_tax_type == '1') {
            _sum_sales_amount += stringutility.convertToFloat(_itemObj.amount)
            //_sum_tax_amount += stringutility.convertToFloat(_itemObj.amount) * stringutility.convertToFloat(_itemObj.taxRate)/100;
            _sum_tax_amount += stringutility.convertToFloat(
              _itemObj.itemTaxAmount
            )
          } else if (_tax_type == '2') {
            _sum_zero_sales_amount += stringutility.convertToFloat(
              _itemObj.amount
            )
          } else if (_tax_type == '3') {
            _sum_free_sales_amount += stringutility.convertToFloat(
              _itemObj.amount
            )
          } else {
            _sum_sales_amount += stringutility.convertToFloat(_itemObj.amount)
            //_sum_tax_amount += stringutility.convertToFloat(_itemObj.amount) * stringutility.convertToFloat(_itemObj.taxRate)/100;
            //20201110 walter modify
            _sum_tax_amount += stringutility.convertToFloat(
              _itemObj.itemTaxAmount
            )
          }
          _newItemAry.push(_itemObj)

          if (i >= 998) break
        }
        //分割999筆
        if (_newItemAry.length != 0) {
          detail_item_ary.splice(0, _newItemAry.length)
        }

        //Amount物件
        var _amountObj = mainObj.amountObj
        _amountObj.taxType = mainObj.taxType
        _amountObj.taxRate = mainObj.taxRate

        _amountObj.salesAmount = _sum_sales_amount
        _amountObj.freeSalesAmount = _sum_free_sales_amount
        _amountObj.zeroSalesAmount = _sum_zero_sales_amount
        //要參考NS的資料-所以不重算
        //_amountObj.taxAmount       = _sum_tax_amount;
        //要參考NS的資料-所以不重算
        //_amountObj.totalAmount = _amountObj.salesAmount+_amountObj.freeSalesAmount+_amountObj.zeroSalesAmount+_amountObj.taxAmount;
        log.debug(
          'mainObj.taxType=' + mainObj.taxType,
          'mainObj.taxRate=' +
            mainObj.taxRate +
            ' ,mainObj.taxType=' +
            mainObj.taxType +
            '_amountObj.salesAmount=' +
            _amountObj.salesAmount +
            ' ,_amountObj.taxAmount=' +
            _amountObj.taxAmount +
            ' ,_amountObj.totalAmount=' +
            _amountObj.totalAmount
        )
        ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //找出折讓單對應的發票紀錄
        var _targetInvoiceObj
        //找到折讓單對應的Invoice資料
        log.debug('voucher_type', 'voucher_type=' + voucher_type)
        log.debug('historyInvoiceObjAry', JSON.stringify(historyInvoiceObjAry))
        if (
          voucher_type === 'ALLOWANCE' &&
          typeof historyInvoiceObjAry !== 'undefined'
        ) {
          for (var i = 0; i < historyInvoiceObjAry.length; i++) {
            var _historyInvoiceObj = historyInvoiceObjAry[i]
            var _historyInvoiceApplyId = _historyInvoiceObj.invoiceApplyId //Invoice ID
            var _historyInvoiceTaxType = _historyInvoiceObj.documentTaxType //稅別代碼 1,2,3,4,9

            var _historySalesAmount = _historyInvoiceObj.salesAmount //應稅
            var _historyFreeSalesAmount = _historyInvoiceObj.freeSalesAmount //免稅
            var _historyZeroSalesAmount = _historyInvoiceObj.zeroSalesAmount //零稅

            if (
              mainObj.createdfromId == _historyInvoiceApplyId &&
              _historySalesAmount >= Math.abs(_amountObj.salesAmount) &&
              _historyFreeSalesAmount >= Math.abs(_amountObj.freeSalesAmount) &&
              _historyZeroSalesAmount >= Math.abs(_amountObj.zeroSalesAmount)
            ) {
              _historyInvoiceObj.salesAmount =
                _historyInvoiceObj.salesAmount -
                Math.abs(_amountObj.salesAmount)
              _historyInvoiceObj.freeSalesAmount =
                _historyInvoiceObj.freeSalesAmount -
                Math.abs(_amountObj.freeSalesAmount)
              _historyInvoiceObj.zeroSalesAmount =
                _historyInvoiceObj.zeroSalesAmount -
                Math.abs(_amountObj.zeroSalesAmount)

              historyInvoiceObjAry[i] = _historyInvoiceObj

              _targetInvoiceObj = _historyInvoiceObj
              log.debug(
                'creditmemo targetInvoiceObj 2 ',
                JSON.stringify(_targetInvoiceObj)
              )
              break
            }
          }
        }
        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
        //2.存檔Main及Details
        var _oneVoucherObj
        if (voucher_type == 'EGUI') {
          _oneVoucherObj = saveMainAndDeatilVoucher(
            voucher_type,
            invoice_type,
            mig_type,
            apply_dept_code,
            apply_class,
            internalid,
            mainObj,
            _newItemAry,
            _targetInvoiceObj,
            need_upload_mig,
            tax_diff_balance,
            apply_user_id
          )
          if (typeof _oneVoucherObj !== 'undefined') {
            historyInvoiceObjAry.push(_oneVoucherObj)
          }
        } else if (voucher_type == 'ALLOWANCE') {
          _oneVoucherObj = saveMainAndDeatilVoucher(
            voucher_type,
            invoice_type,
            mig_type,
            apply_dept_code,
            apply_class,
            internalid,
            mainObj,
            _newItemAry,
            _targetInvoiceObj,
            need_upload_mig,
            tax_diff_balance,
            apply_user_id
          )
        }
      }

      //處理其他999筆
      log.debug('剩餘筆數:', '剩餘筆數=' + detail_item_ary.length)
      if (detail_item_ary.length != 0) {
        resetMainObjectTaxInformation(
          voucher_type,
          invoice_type,
          mig_type,
          apply_dept_code,
          apply_class,
          internalid,
          mainObj,
          detail_item_ary,
          historyInvoiceObjAry,
          need_upload_mig,
          tax_diff_balance,
          apply_user_id
        )
      }
    } catch (e) {
      log.error(e.name, e.message)
    }
  }

  //20201013
  function getTaxYearMonth(_dateString) {
    var _year = parseInt(_dateString.slice(0, 4))
    var _month = parseInt(_dateString.slice(5, 6))

    if (_month % 2 != 0) _month = _month + 1
    if (_month < 10) {
      _month = '0' + _month
    }
    _year = parseInt(_year) - 1911

    return _year + '' + _month
  }

  //檢查稅差
  function checkVoucherTaxDifference(tax_diff_balance, details) {
    var _tax_diff_error = false
    try {
      var _ns_tax_rate = 0
      var _ns_sales_amount = 0
      var _ns_tax_amount = 0
      if (typeof details !== 'undefined') {
        for (var i = 0; i < details.length; i++) {
          var _obj = details[i]

          var _item_amount = _obj.amount
          var _item_tax_amount = _obj.itemTaxAmount
          var _item_total_amount = _obj.itemTotalAmount
          var _item_tax_rate = _obj.taxRate //5.00

          //紀錄NS應稅金額
          if (stringutility.convertToFloat(_item_tax_rate) != 0) {
            _ns_sales_amount += stringutility.convertToFloat(_item_amount)
            _ns_tax_rate = stringutility.convertToFloat(_item_tax_rate) / 100
          }
          //紀錄NS的稅額
          _ns_tax_amount += stringutility.convertToFloat(_item_tax_amount)
        }
      }

      if (tax_diff_balance < 999) {
        _tax_diff_error = invoiceutility.checkTaxDifference(
          _ns_sales_amount,
          _ns_tax_rate,
          _ns_tax_amount,
          tax_diff_balance
        )
      }
       
    } catch (e) {
      log.error(e.name, e.message)
    }
    return _tax_diff_error
  }

  //分稅別=>單張開立
  function saveMainAndDeatilVoucher(
    voucher_type,
    invoice_type,
    mig_type,
    apply_dept_code,
    apply_class,
    internalid,
    jsonObj,
    detail_item_ary,
    historyInvoiceObj,
    need_upload_mig,
    tax_diff_balance,
    apply_user_id
  ) {
    var _invoiceObj
    var _mainRecordId
    try {
      //var _documentDate = getCompanyLocatDate();
      //var _documentTime = getCompanyLocatTime()
	  var _documentTime = dateutility.getCompanyLocatTime();
      //var _year_month   = getTaxYearMonth();

      var trandate = jsonObj.trandate
      //處理年月 2020/10/13
      var _formattedDate = format.format({
        value: trandate,
        type: format.Type.DATETIME,
        timezone: format.Timezone.ASIA_TAIPEI,
      })
      var _documentDate = dateutility.getConvertDateByDate(trandate)
      var _year_month = dateutility.getTaxYearMonthByDate(trandate) //10910
      //var _documentDate = dateutility.getConvertDateByDateObj(_formattedDate);  //20201005
      var _applyPeriod = getApplyPeriodOptions(_year_month)
      log.debug(
        '_documentDate',
        '_documentDate=' +
          _documentDate +
          ' documentTime:' +
          _documentTime +
          ' ,year_month=' +
          _year_month
      )
log.debug('檢查 jsonObj',  JSON.stringify(jsonObj))
      //_documentDate='20200911';_documentTime='23:59:59';_year_month='10910';
      var _net_value = 1
      var _assignLogType = 'TYPE_1'
      var _documentNumber = ''

      ////////////////////////////////////////////////////////////////////////////////////////////////////////
      //20201113 walter modify 檢查稅差
      //處理Amount
      /**
         var _tax_diff_error = false;
         var _checkAmountObj = jsonObj.amountObj;
         var _ns_sales_amount = Math.abs(_checkAmountObj.salesAmount);
         //_ns_tax_rate=0.05
         var _ns_tax_rate     = _checkAmountObj.taxRate;
         var _ns_tax_amount   = Math.abs(_checkAmountObj.taxAmount);
         if (tax_diff_balance < 999) {
				 _tax_diff_error = invoiceutility.checkTaxDifference(_ns_sales_amount, _ns_tax_rate, _ns_tax_amount, tax_diff_balance);
			}
         */
      var _tax_diff_error = checkVoucherTaxDifference(
        tax_diff_balance,
        detail_item_ary
      )
      log.debug('檢查稅差-1', '_tax_diff_error=' + _tax_diff_error)
      ///////////////////////////////////////////////////////////////////////////////////////////////////////
      var _amountObj = jsonObj.amountObj
      //20210909 walter modify 稅為負項就要alert
      if (voucher_type == 'EGUI') {
    	  //發票
    	  if (_amountObj.taxAmount<0) _tax_diff_error = true
      } else {
    	  //折讓單
    	  if (-1*_amountObj.taxAmount<0) _tax_diff_error = true
      }

      ///////////////////////////////////////////////////////////////////////////////////////////////////////
      //default format code
      var _voucherFormatCode = _invoceFormatCode
      if (voucher_type === 'EGUI' && _tax_diff_error == false) {
        var eGUIConfig = gwDaoEguiConfig.getSetting()
        //發票號碼 apply_dept_code, apply_class
        //_documentNumber = invoiceutility.getAssignLogNumber(invoice_type, jsonObj.sellerIdentifier, stringutility.trim(jsonObj.department), stringutility.trim(jsonObj.classId), _year_month, need_upload_mig, _documentDate);
        var _assignlog_dept_code = apply_dept_code
        var _assignlog_class_code = apply_class 
          
        _assignlog_dept_code = (stringutility.trim(apply_dept_code) == 'USE_INVOICE' && eGUIConfig.isEGUIDepartment)
            ? stringutility.trim(jsonObj.department) : ''
        _assignlog_class_code = (stringutility.trim(apply_dept_code) == 'USE_INVOICE' && eGUIConfig.isEGUIClass)
            ? stringutility.trim(jsonObj.classId) : ''
        log.debug({
          title: '_assignlog_dept_code | _assignlog_class_code',
          details: `${_assignlog_dept_code} | ${_assignlog_class_code}`
        })
        if (need_upload_mig != 'ALL' && voucher_type != need_upload_mig) {
         /**
          _documentNumber = invoiceutility.getAssignLogNumber(
            invoice_type,
            jsonObj.sellerIdentifier,
            stringutility.trim(_assignlog_dept_code),
            stringutility.trim(_assignlog_class_code),
            _year_month,
            'NONE',
            _documentDate
          )
          */
          if (validate.isValidGUI(jsonObj.buyerIdentifier)==true || 
        	  jsonObj.buyerIdentifier =='0000000000') {
	          _documentNumber = invoiceutility.getAssignLogNumberAndCheckDuplicate(
				            -1,
				            invoice_type,
				            jsonObj.sellerIdentifier,
				            stringutility.trim(_assignlog_dept_code),
				            stringutility.trim(_assignlog_class_code),
				            _year_month,
				            'NONE',
				            _documentDate
				          )
          }     
			          
        } else {
          /**	
          _documentNumber = invoiceutility.getAssignLogNumber(
            invoice_type,
            jsonObj.sellerIdentifier,
            stringutility.trim(_assignlog_dept_code),
            stringutility.trim(_assignlog_class_code),
            _year_month,
            need_upload_mig,
            _documentDate
          )
          */
       	  if (validate.isValidGUI(jsonObj.buyerIdentifier)==true || 
           	  jsonObj.buyerIdentifier =='0000000000') {	
	          _documentNumber = invoiceutility.getAssignLogNumberAndCheckDuplicate(
				            -1,
				            invoice_type,
				            jsonObj.sellerIdentifier,
				            stringutility.trim(_assignlog_dept_code),
				            stringutility.trim(_assignlog_class_code),
				            _year_month,
				            need_upload_mig,
				            _documentDate
				          )
          }          
        }
        log.debug(
          '_documentNumber',
          '_documentNumber=' +
            _documentNumber +
            ' _assignlog_dept_code:' +
            _assignlog_dept_code +
            ' ,jsonObj.department=' +
            jsonObj.department +
            ' , USE_TYPE=' +
            apply_dept_code
        )
      } else {
        //折讓單號碼
        if (
          typeof historyInvoiceObj !== 'undefined' &&
          _tax_diff_error == false
        ) {
          _net_value = -1
          var _today = getCompanyLocatDate()
          _documentNumber = (invoiceutility.getAllowanceNumber(_allowance_pre_code, stringutility.trim(_today)))
          _voucherFormatCode = _creditMemoFormatCode
        }
        log.debug('檢查-getAllowanceNumber', 'documentNumber=' + _documentNumber)
      } 
      
      var _status = 'VOUCHER_SUCCESS'
      var _voucherMainRecord = record.create({
        type: _voucher_main_record,
        isDynamic: true,
      })

      _voucherMainRecord.setValue({
        fieldId: 'name',
        value: 'VoucherMainRecord',
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_apply_internal_id',
        value: parseInt(internalid),
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_voucher_type',
        value: voucher_type,
      })
      //20230324
      if (voucher_type=='EGUI'){
    	  _voucherMainRecord.setValue({
	        fieldId: 'custrecord_gw_dm_mig_type',
	        value: _egui_gw_dm_mig_type,
	      })
      }else{
    	  _voucherMainRecord.setValue({
  	        fieldId: 'custrecord_gw_dm_mig_type',
  	        value: _allowance_gw_dm_mig_type,
  	      })
      }
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_voucher_number',
        value: _documentNumber,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_voucher_date',
        value: _documentDate,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_voucher_time',
        value: _documentTime,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_voucher_yearmonth',
        value: _year_month,
      })
      //20201230 walter modify
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_voucher_sale_tax_apply_period',
        value: _applyPeriod,
      })

      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_seller',
        value: jsonObj.sellerIdentifier,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_seller_name',
        value: jsonObj.sellerName,
      })
      log.debug('檢查-sellerAddress', 'jsonObj.sellerAddress=' + jsonObj.sellerAddress)
      log.debug('檢查-stringutility.trim', 'jsonObj.sellerAddress=' + stringutility.trim(jsonObj.sellerAddress))
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_seller_address',
        value: stringutility.trim(jsonObj.sellerAddress),
      })
      //20201030 walter modify
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_original_buyer_id',
        value: jsonObj.buyerId,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_buyer',
        value: jsonObj.buyerIdentifier,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_buyer_name',
        value: jsonObj.buyerName,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_buyer_address',
        value: stringutility.trim(jsonObj.buyerAddress),
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_buyer_email',
        value: stringutility.trim(jsonObj.buyerEmail),
      })
      //_voucherMainRecord.setValue({fieldId:'custrecord_gw_buyer_dept_code',value:_main.dept_code});	//暫時不用
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_voucher_dept_code',
        value: stringutility.trim(jsonObj.department),
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_voucher_dept_name',
        value: stringutility.trim(jsonObj.department),
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_voucher_classification',
        value: stringutility.trim(jsonObj.classId),
      })
      //零稅資料
      if (stringutility.trim(jsonObj.applicable_zero_tax) != '') {
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_applicable_zero_tax',
          value: jsonObj.applicable_zero_tax,
        })
      }
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_customs_export_category',
        value: jsonObj.customs_export_category,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_customs_export_no',
        value: jsonObj.customs_export_no,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_customs_export_date',
        value: jsonObj.customs_export_date,
      })

      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_invoice_type',
        value: stringutility.trim(invoice_type),
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_mig_type',
        value: stringutility.trim(mig_type),
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_voucher_format_code',
        value: stringutility.trim(_voucherFormatCode),
      })
      if (jsonObj.mainRemark!=null){
	      _voucherMainRecord.setValue({
	        fieldId: 'custrecord_gw_main_remark',
	        value: stringutility.trim(jsonObj.mainRemark),
	      })
      }
      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
      //20210913 walter modify
      _voucherMainRecord.setValue({fieldId:'custrecord_gw_carrier_type',value:stringutility.trim(jsonObj.carrier_type)});
      if (jsonObj.carrier_id_1!=null)_voucherMainRecord.setValue({fieldId:'custrecord_gw_carrierid1',value:stringutility.trim(jsonObj.carrier_id_1)});
      if (jsonObj.carrier_id_2!=null)_voucherMainRecord.setValue({fieldId:'custrecord_gw_carrierid2',value:stringutility.trim(jsonObj.carrier_id_2)});
      if (jsonObj.npo_ban!=null)_voucherMainRecord.setValue({fieldId:'custrecord_gw_npoban',value:stringutility.trim(jsonObj.npo_ban)});
      //_voucherMainRecord.setValue({fieldId:'custrecord_gw_clearance_mark',value:stringutility.trim(jsonObj.customs_clearance_mark)});
      //_voucherMainRecord.setValue({fieldId:'custrecord_gw_main_remark',value:stringutility.trim(jsonObj.main_remark)});
      ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
     
      var _random_number = ' '
      var _print_mark = 'Y'
      if (voucher_type === 'EGUI') {
    	  _print_mark = invoiceutility.getPrintMark(jsonObj.npo_ban, jsonObj.carrier_type, jsonObj.buyerIdentifier)
      }
      log.debug('檢查-print_mark', '_print_mark=' + _print_mark)
      if (mig_type == 'C0401' || mig_type == 'B2C') {
         //TODO 要產生隨機碼
         //_random_number = Math.round(invoiceutility.getRandomNum(1000, 9999))
		 _random_number = invoiceutility.getRandomNumNew(_documentNumber, jsonObj.sellerIdentifier)
         //_print_mark = 'Y'
      } 
      
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_print_mark',
        value: _print_mark,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_is_printed',
        value: 'N',
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_random_number',
        value: _random_number,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_discount_amount',
        value: 0,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_discount_count',
        value: '0',
      })
      if (voucher_type === 'ALLOWANCE') {
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_voucher_owner',
          value: '2',
        }) //折讓單專用欄位(1:買方, 2賣方)
      }
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_voucher_status',
        value: _status,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_voucher_upload_status',
        value: _default_upload_status,
      })

      //處理Amount 
      if (voucher_type === 'EGUI' && _amountObj.zeroSalesAmount != 0) {
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_clearance_mark',
          value: stringutility.trim(jsonObj.customs_clearance_mark),
        })
      }
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_sales_amount',
        value: _net_value * _amountObj.salesAmount,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_free_sales_amount',
        value: _net_value * _amountObj.freeSalesAmount,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_zero_sales_amount',
        value: _net_value * _amountObj.zeroSalesAmount,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_tax_amount',
        value: _net_value * _amountObj.taxAmount,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_tax_type',
        value: _amountObj.taxType,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_tax_rate',
        value: _amountObj.taxRate,
      })
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_total_amount',
        value: _net_value * _amountObj.totalAmount,
      })

      //20210202 walter modify
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_need_upload_egui_mig',
        value: need_upload_mig,
      })
      //voucher_type    ==> EGUI, ALLOWANCE
      //need_upload_mig ==> ALL, EGUI, ALLOWANCE, NONE
      if (need_upload_mig != 'ALL' && voucher_type != need_upload_mig) {
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_need_upload_egui_mig',
          value: 'NONE',
        })
      }
      /**
         if (voucher_type != 'EGUI' && need_upload_mig == 'EGUI') {
				//折讓單處理
				_voucherMainRecord.setValue({fieldId:'custrecord_gw_need_upload_egui_mig',value:'NONE'});
			}
         */ 
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_lock_transaction',
        value: true,
      })

      if (_tax_diff_error == true) {
        //檢查稅差超過
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_need_upload_egui_mig',
          value: 'NONE',
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_voucher_upload_status',
          value: 'E',
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_uploadstatus_messag',
          value: '稅差超過(' + tax_diff_balance + ')元 ,請重新調整!',
        })
      } else if (voucher_type == 'EGUI' && stringutility.trim(_documentNumber) == '') {
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_need_upload_egui_mig',
          value: 'NONE',
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_voucher_upload_status',
          value: 'E',
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_uploadstatus_messag',
          value: '無字軌可使用或開立日期小於字軌日期',
        })
      } if (validate.isValidGUI(jsonObj.buyerIdentifier)==false && jsonObj.buyerIdentifier !='0000000000'){
    	  _documentNumber='';
		  _voucherMainRecord.setValue({fieldId:'custrecord_gw_voucher_number',value:_documentNumber}); 
		  _voucherMainRecord.setValue({fieldId:'custrecord_gw_need_upload_egui_mig',value:'NONE'});
		  _voucherMainRecord.setValue({fieldId:'custrecord_gw_voucher_upload_status',value:'E'}); 				
		  _voucherMainRecord.setValue({fieldId:'custrecord_gw_uploadstatus_messag',value:'統編(' + jsonObj.buyerIdentifier + ')錯誤!'});
		  
      } else if (voucher_type == 'EGUI' && stringutility.trim(_documentNumber) == 'BUSY') {
    	  _documentNumber='';
		  _voucherMainRecord.setValue({fieldId:'custrecord_gw_voucher_number',value:_documentNumber}); 
		  _voucherMainRecord.setValue({fieldId:'custrecord_gw_need_upload_egui_mig',value:'NONE'});
		  _voucherMainRecord.setValue({fieldId:'custrecord_gw_voucher_upload_status',value:'E'}); 				
		  _voucherMainRecord.setValue({fieldId:'custrecord_gw_uploadstatus_messag',value:'本期(' + _year_month + ')字軌使用忙碌,請稍後再開立!'});
      } else if (voucher_type == 'ALLOWANCE' && typeof historyInvoiceObj == 'undefined' ) {
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_need_upload_egui_mig',
          value: 'NONE',
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_voucher_upload_status',
          value: 'E',
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_uploadstatus_messag',
          value: '折讓條件無發票可扣',
        })
      } else if (voucher_type == 'EGUI' && stringutility.trim(jsonObj.buyerName) == '') {
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_need_upload_egui_mig',
          value: 'NONE',
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_voucher_upload_status',
          value: 'E',
        })
        _voucherMainRecord.setValue({
          fieldId: 'custrecord_gw_uploadstatus_messag',
          value: '買方公司名稱不可空白',
        })
      }
      //20201111 walter modify
      _voucherMainRecord.setValue({
        fieldId: 'custrecord_gw_voucher_main_apply_user_id',
        value: apply_user_id,
      })

      try {
        _mainRecordId = _voucherMainRecord.save()
        if (
          voucher_type === 'EGUI' &&
          stringutility.trim(_documentNumber) !== ''
        ) {
          _invoiceObj = {
            applyId: _mainRecordId, //紀錄EGUI ID
            invoiceApplyId: jsonObj.applyId, //紀錄Invoice ID
            documentNumber: _documentNumber,
            documentTaxType: jsonObj.taxType,
            documentDate: _documentDate,
            documentTime: _documentTime,
            documentYearMonth: _year_month,
            salesAmount: _amountObj.salesAmount,
            freeSalesAmount: _amountObj.freeSalesAmount,
            zeroSalesAmount: _amountObj.zeroSalesAmount,
          }
        }
        log.debug('main save', '_mainRecordId=' + _mainRecordId)
      } catch (e) {
        log.error(e.name, e.message)
      }

      if (typeof jsonObj !== 'undefined') {
        var _row = 0
        
        var _gw_ns_document_apply_id = -1;
        if (typeof detail_item_ary !== 'undefined') {
          for (var i = 0; i < detail_item_ary.length; i++) {
            var _detailObj = detail_item_ary[i]

            //Save Detail Record
            var _voucherDetailRecord = record.create({
              type: _voucher_details_record,
              isDynamic: true,
            })
            _voucherDetailRecord.setValue({
              fieldId: 'name',
              value: 'VoucherDetailRecord',
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_dtl_apply_internal_id',
              value: parseInt(internalid),
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_voucher_main_internal_id',
              value: _mainRecordId.toString(),
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_dtl_voucher_type',
              value: voucher_type,
            })

            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_item_description',
              value: stringutility.trim(_detailObj.description),
            })

            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_unit_price',
              value: stringutility.trim(_detailObj.unitPrice),
            })

            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_item_unit',
              value: stringutility.trim(_detailObj.itemUnit),
            })
            
            var _item_quantity = _detailObj.quantity
            //20210909 walter 預設值設為1
            if (_item_quantity.trim().length==0)_item_quantity='1'
            	
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_item_quantity',
              value:
                _net_value * stringutility.convertToFloat(_item_quantity),
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_item_amount',
              value:
                _net_value * stringutility.convertToFloat(_detailObj.amount),
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_item_tax_amount',
              value:
                _net_value *
                stringutility.convertToFloat(_detailObj.itemTaxAmount),
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_item_total_amount',
              value:
                _net_value *
                stringutility.convertToFloat(_detailObj.itemTotalAmount),
            })

            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_dtl_item_tax_code',
              value: stringutility.trim(_detailObj.taxCode),
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_dtl_item_tax_rate',
              value: stringutility.trim(_detailObj.taxRate),
            })

            _row++
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_item_seq',
              value: _row.toString(),
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_item_remark',
              value: stringutility.trim(_detailObj.itemRemark),
            })

            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_dtl_voucher_number',
              value: _documentNumber,
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_dtl_voucher_date',
              value: _documentDate,
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_dtl_voucher_time',
              value: _documentTime,
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_dtl_voucher_yearmonth',
              value: _year_month,
            })

            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_dtl_voucher_status',
              value: _status,
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_dtl_voucher_upload_status',
              value: _default_upload_status,
            })

            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_ns_document_type',
              value: _detailObj.nsDocumentType,
            })
            
            
            if (_detailObj.nsDocumentType == 'SALES_ORDER') {
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_ns_document_apply_id',
                value: stringutility.convertToInt(_detailObj.nsDocumentApplyId),
              })
              
              _gw_ns_document_apply_id = stringutility.convertToInt(_detailObj.nsDocumentApplyId)
            } else {
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_ns_document_apply_id',
                value: stringutility.convertToInt(jsonObj.applyId),
              })
              
              _gw_ns_document_apply_id = stringutility.convertToInt(jsonObj.applyId)
            }
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_ns_document_number',
              value: _detailObj.nsDocumentNumber,
            }) //放document number
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_ns_document_item_id',
              value: _detailObj.nsDocumentItemId,
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_ns_document_items_seq',
              value: _detailObj.nsDocumentItemSeq,
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_ns_item_discount_amount',
              value: '0',
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_ns_item_discount_count',
              value: '0',
            })
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_dtl_voucher_apply_period',
              value: _applyPeriod,
            })

            if (
              voucher_type == 'ALLOWANCE' &&
              typeof historyInvoiceObj != 'undefined' &&
              typeof historyInvoiceObj.documentNumber != 'undefined'
            ) {
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_original_gui_internal_id',
                value: stringutility.convertToInt(historyInvoiceObj.applyId),
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_original_gui_number',
                value: historyInvoiceObj.documentNumber,
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_original_gui_date',
                value: historyInvoiceObj.documentDate,
              })
              _voucherDetailRecord.setValue({
                fieldId: 'custrecord_gw_original_gui_yearmonth',
                value: historyInvoiceObj.documentYearMonth,
              })
            }
            _voucherDetailRecord.setValue({
              fieldId: 'custrecord_gw_dtl_item_relate_number',
              value: stringutility.trim(_detailObj.itemRelateNumber),
            })
            try {
              var callId = _voucherDetailRecord.save()
            } catch (e) {
              log.error(e.name, e.message)
            }
          }

          try {
        	var _gw_ns_document_apply_id_ary=[];
        	_gw_ns_document_apply_id_ary.push(_gw_ns_document_apply_id);
        	   
            var values = {}
            values['custrecord_gw_is_completed_detail'] = true
            values['custrecord_gw_ns_transaction'] = _gw_ns_document_apply_id_ary
            var _id = record.submitFields({
              type: _voucher_main_record,
              id: _mainRecordId,
              values: values,
              options: {
                enableSourcing: false,
                ignoreMandatoryFields: true,
              },
            })
          } catch (e) {
            console.log(e.name + ':' + e.message)
          }
        }
      }
      /////////////////////////////////////////////////////////////////////////////////////////////////
      log.debug('lock applyId', 'jsonObj.applyId=' + jsonObj.applyId)
      //1. 發票金額更新
      if (voucher_type === 'ALLOWANCE') {
        var _deduction_amount =
          _net_value *
          (_amountObj.salesAmount +
            _amountObj.freeSalesAmount +
            _amountObj.zeroSalesAmount)
        updateEGUIDiscountAmount(
          historyInvoiceObj.applyId,
          _net_value * _amountObj.salesAmount,
          _net_value * _amountObj.freeSalesAmount,
          _net_value * _amountObj.zeroSalesAmount,
          _deduction_amount
        )
      }
      //2. lock invoice
      log.debug('START LOCK')
      lockNSInvoiceRecord(
    	_voucherMainRecord,
        voucher_type,
        jsonObj.applyId,
        _documentNumber,
        historyInvoiceObj
      )
      log.debug('END LOCK')
      /////////////////////////////////////////////////////////////////////////////////////////////////
      //3.紀錄Deducted Amount
      /**
         if (voucher_type === 'EGUI' && typeof(jsonObj) !== "undefined") {
				var _customer_deposit_item_ary = jsonObj.customerDeductionItemAry;
				log.debug('_customer_deposit_item_ary','_customer_deposit_item_ary='+JSON.stringify(_customer_deposit_item_ary));
				if (typeof(_customer_deposit_item_ary) !== "undefined" && _customer_deposit_item_ary.length !=0) {
                   for (var i=0; i<_customer_deposit_item_ary.length; i++) {
                        var _itemJsonObj = _customer_deposit_item_ary[i];
						log.debug('_customer_deposit_item_jsonObj','_itemJsonObj='+JSON.stringify(_itemJsonObj));
						var _assign_document_id = stringutility.convertToInt(_itemJsonObj.nsDocumentApplyId);
						var _tax_type           = _itemJsonObj.taxType;
						//負項要轉正
						var _dedcution_amount   = Math.abs(stringutility.convertToFloat(_itemJsonObj.amount));

						searchAndUpdateVoucherDepositDedcutedAmount(_assign_document_id, _tax_type, _dedcution_amount);
				   }

				}
			}
         */
      /////////////////////////////////////////////////////////////////////////////////////////////////
    } catch (e) {
      log.error(e.name, e.message)
    }

    return _invoiceObj
  }

  //處理CustomerDeposit餘額
  function searchAndUpdateVoucherDepositDedcutedAmount(
    assign_document_id,
    tax_type,
    invoice_dedcuted_amount
  ) {
    try {
      var _mySearch = search.create({
        type: _gwDepositVoucherRecordId,
        columns: [
          search.createColumn({
            name: 'custrecord_gw_deposit_dedcuted_amount',
          }),
          search.createColumn({ name: 'custrecord_gw_deposit_egui_amount' }),
        ],
      })

      var _filterArray = []
      _filterArray.push([
        'custrecord_gw_assign_document_id',
        search.Operator.EQUALTO,
        assign_document_id,
      ])
      _filterArray.push('and')
      _filterArray.push([
        'custrecord_gw_deposit_egui_tax_type',
        search.Operator.IS,
        tax_type,
      ])
      _mySearch.filterExpression = _filterArray
      //alert('Parse _filterArray='+JSON.stringify(_filterArray));

      _mySearch.run().each(function (result) {
        var _internalid = result.id

        var _deposit_egui_amount = stringutility.convertToInt(
          result.getValue({
            name: 'custrecord_gw_deposit_egui_amount',
          })
        )
        var _deposit_dedcuted_amount = stringutility.convertToFloat(
          result.getValue({
            name: 'custrecord_gw_deposit_dedcuted_amount',
          })
        )

        //可扣餘額
        var _balance_amount = _deposit_egui_amount - _deposit_dedcuted_amount

        if (invoice_dedcuted_amount >= _balance_amount) {
          _deposit_dedcuted_amount = _deposit_egui_amount
          invoice_dedcuted_amount -= _balance_amount
        } else {
          _deposit_dedcuted_amount += invoice_dedcuted_amount
        }

        /////////////////////////////////////////////////////////////////////////////////
        //update _deposit_dedcuted_amount
        var values = {}
        values[
          'custrecord_gw_deposit_dedcuted_amount'
        ] = _deposit_dedcuted_amount
        var _id = record.submitFields({
          type: _gwDepositVoucherRecordId,
          id: _internalid,
          values: values,
          options: {
            enableSourcing: false,
            ignoreMandatoryFields: true,
          },
        })
        log.debug('Update ' + _gwDepositVoucherRecordId, ' id=' + _id)
        /////////////////////////////////////////////////////////////////////////////////
        return true
      })
    } catch (e) {
      log.error(e.name, e.message)
    }
  }

  //折讓金額更新
  function updateEGUIDiscountAmount(
    internalId,
    sales_amount,
    free_amount,
    zero_amount,
    amount
  ) {
    try {
      log.debug(
        'updateEGUIDiscountAmount',
        '_voucher_main_record=' +
          _voucher_main_record +
          ' , internalId=' +
          internalId
      )
      var _record = record.load({
        type: _voucher_main_record,
        id: parseInt(internalId),
        isDynamic: true,
      })
      var _discount_sales_amount =
        stringutility.convertToFloat(
          _record.getValue({ fieldId: 'custrecord_gw_discount_sales_amount' })
        ) + sales_amount
      var _discount_free_amount =
        stringutility.convertToFloat(
          _record.getValue({ fieldId: 'custrecord_gw_discount_free_amount' })
        ) + free_amount
      var _discount_zero_amount =
        stringutility.convertToFloat(
          _record.getValue({ fieldId: 'custrecord_gw_discount_zero_amount' })
        ) + zero_amount
      var _discount_amount =
        stringutility.convertToFloat(
          _record.getValue({ fieldId: 'custrecord_gw_discount_amount' })
        ) + amount

      var _discount_count =
        parseInt(
          _record.getValue({ fieldId: 'custrecord_gw_discount_count' })
        ) + 1

      _record.setValue({
        fieldId: 'custrecord_gw_discount_sales_amount',
        value: Math.abs(_discount_sales_amount),
      })
      _record.setValue({
        fieldId: 'custrecord_gw_discount_free_amount',
        value: Math.abs(_discount_free_amount),
      })
      _record.setValue({
        fieldId: 'custrecord_gw_discount_zero_amount',
        value: Math.abs(_discount_zero_amount),
      })

      _record.setValue({
        fieldId: 'custrecord_gw_discount_amount',
        value: Math.abs(_discount_amount),
      })
      _record.setValue({
        fieldId: 'custrecord_gw_discount_count',
        value: _discount_count,
      })
      log.debug(
        'updateEGUIDiscountAmount',
        '_discount_amount=' +
          _discount_amount +
          ' _discount_count=' +
          _discount_count
      )
      try {
        _record.save()
      } catch (e) {
        log.error(e.name, e.message)
      }
    } catch (e) {
      log.error(e.name, e.message)
    }
  }

  function closeNSScheduleTask(internalId, invoice_completed_ids_ary) {
    try {
      var _record = record.load({
        type: _voucher_apply_list_record,
        id: parseInt(internalId),
        isDynamic: true,
      })

      var _todo_ids_list = []
      if (invoice_completed_ids_ary != null) {
        var _invoice_todo_list = _record.getValue({
          fieldId: 'custrecord_gw_invoice_todo_list',
        })
        var _invoice_todo_ary = _invoice_todo_list.split(',')

        for (var i = 0; i < _invoice_todo_ary.length; i++) {
          var _id = _invoice_todo_ary[i]

          var _isExist = false
          for (var j = 0; j < invoice_completed_ids_ary.length; j++) {
            var _completed_id = invoice_completed_ids_ary[j]
            if (_id == _completed_id) {
              _isExist = true
              break
            }
          }
          //沒做完留下來
          if (_id != '-1' && _isExist == false) {
            _todo_ids_list.push(_id)
          }
        }
        _record.setValue({
          fieldId: 'custrecord_gw_invoice_todo_list',
          value: stringutility.trim(_todo_ids_list.toString()),
        })
      }
      if (stringutility.trim(_todo_ids_list.toString()).length == 0) {
        _record.setValue({
          fieldId: 'custrecord_gw_completed_schedule_task',
          value: 'Y',
        })
      }
      try {
        _record.save()
      } catch (e) {
        log.error(e.name, e.message)
      }
    } catch (e) {
      log.error(e.name, e.message)
    }
  }

  //20: for transaction records
  function lockNSInvoiceRecord(
	voucher_main_record,
    voucher_type,
    internalId,
    documentNumber,
    historyInvoiceObj
  ) {
    try {
      var values = {}
      //values[_invoce_control_field_id] = _invoce_control_field_value;

      var _recordTypeID = record.Type.INVOICE

      if (voucher_type === 'ALLOWANCE') {
        _recordTypeID = record.Type.CREDIT_MEMO

        _invoce_control_field_id = gwconfigure.getCredMemoControlFieldId()
        _invoce_control_field_value = gwconfigure.lockCredMemoControlFieldId()

        values[_invoce_control_field_id] = _invoce_control_field_value
        values[_gw_allowance_num_start_field] = documentNumber
        values[_gw_allowance_num_end_field] = documentNumber
        //20201123 walter 紀錄折讓單扣抵發票號碼
        if (
          typeof historyInvoiceObj !== 'undefined' &&
          typeof historyInvoiceObj.documentNumber !== 'undefined'
        ) {
          values[_deduction_egui_number_field] =
            historyInvoiceObj.documentNumber
        }
      } else {
        values[_invoce_control_field_id] = _invoce_control_field_value

        values[_gw_gui_num_start_field] = documentNumber
        values[_gw_gui_num_end_field] = documentNumber
      }
      
      syncToNetsuiteDocument(voucher_main_record, values)
      
      log.debug(
        'lockNSInvoiceRecord',
        'voucher_type=' +
          voucher_type +
          ' ,internalId=' +
          internalId +
          ' ,documentNumber=' +
          documentNumber +
          ',' +
          _invoce_control_field_id +
          '=' +
          _invoce_control_field_value
      )

      try {
        record.submitFields({
          type: _recordTypeID,
          id: parseInt(internalId),
          values: values,
          options: {
            enableSourcing: false,
            ignoreMandatoryFields: true,
          },
        })
      } catch (e) {
        log.error(e.name, e.message)
      }
    } catch (e) {
      log.error(e.name, e.message)
    }
  }
  
  function syncToNetsuiteDocument(voucher_main_record, values) { 	
    try { 	
    	//有資料就不再更新           	
    	//_access_model NETSUITE / GATEWEB
    	var _access_model = voucher_main_record.getValue({fieldId: 'custrecord_gw_upload_access_model'}) 
    	//應稅銷售額
    	var _gui_sales_amt = voucher_main_record.getValue({fieldId: 'custrecord_gw_sales_amount'})
    	//稅額
    	var _gui_tax_amt = voucher_main_record.getValue({fieldId: 'custrecord_gw_tax_amount'})
    	//總計
    	var _gui_total_amt = voucher_main_record.getValue({fieldId: 'custrecord_gw_total_amount'})
    	if (_access_model=='GATEWEB') {
    		_gui_total_amt = (stringutility.convertToFloat(_gui_total_amt)-stringutility.convertToFloat(_gui_tax_amt)).toString()
    		//稅率 tax_rate = 0.05
    		var _tax_rate = voucher_main_record.getValue({fieldId: 'custrecord_gw_tax_rate'})
    		_gui_tax_amt = Math.round(stringutility.convertToFloat(_sales_amount) * stringutility.convertToFloat(_tax_rate)).toString()
    		
    		_gui_total_amt = (stringutility.convertToFloat(_gui_total_amt)+stringutility.convertToFloat(_gui_tax_amt)).toString()  
    	} 
    	//稅額
  	    values['custbody_gw_gui_tax_amt'] = _gui_tax_amt
  	    //發票期別
	    values['custbody_gw_gui_tax_file_date'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_yearmonth'}) 
	    //稅率  
	    values['custbody_gw_gui_tax_rate'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_tax_rate'})	
	    //課稅別  
	    values['custbody_gw_gui_tax_type'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_tax_type'})	
	    //總計
	    values['custbody_gw_gui_total_amt'] = _gui_total_amt
	    //發票日期  
	    var _gw_voucher_date = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_date'})
        values['custbody_gw_gui_date'] = convertStringToDate(_gw_voucher_date.toString())
	    //發票不上傳
	    if (_need_upload_egui_mig=='NONE') values['custbody_gw_gui_not_upload'] = true 
	    //應稅銷售額
	    values['custbody_gw_gui_sales_amt'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_sales_amount'})    
	    //免稅銷售額	
	    values['custbody_gw_gui_sales_amt_tax_exempt'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_free_sales_amount'}) 
	    //零稅銷售額 
	    values['custbody_gw_gui_sales_amt_tax_zero'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_zero_sales_amount'})	 
	    //發票部門
	    values['custbody_gw_gui_department'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_dept_code'}) 
	    //發票分類
	    values['custbody_gw_gui_class'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_classification'}) 
	    //營業稅申報期別  
	    values['custbody_gw_gui_apply_period'] = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_yearmonth'})  
	    
	    //開立狀態   
	    var _gw_voucher_status = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_status'})
	    var _gw_voucher_upload_status = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_upload_status'})
	    var _need_upload_egui_mig = voucher_main_record.getValue({fieldId: 'custrecord_gw_need_upload_egui_mig'})
	        	    
	    values['custbody_gw_evidence_issue_status'] = synceguidocument.getGwEvidenceStatus(_gw_voucher_status, _gw_voucher_upload_status, _need_upload_egui_mig)
	    //憑證格式代號 
	    var _mof_code = voucher_main_record.getValue({fieldId: 'custrecord_gw_invoice_type'})
	    var _format_code = voucher_main_record.getValue({fieldId: 'custrecord_gw_voucher_format_code'})
	    log.debug('custbody_gw_gui_format', 'mof_code='+_mof_code+',format_code='+_format_code)
	    
	    var _gw_gui_format_obj = doc_format_21.getByValueAndMofCode(_format_code, _mof_code)
	    values['custbody_gw_gui_format'] = _gw_gui_format_obj.id		
	  
    } catch (e) {
        log.error(e.name, e.message)
    } 
  }
  
  function convertStringToDate(date_str) {   
	 log.debug('convertStringToDate', 'date_str='+date_str) 	 
	 var _year  = parseInt(date_str.substring(0, 4)) 
	 var _month = parseInt(date_str.substring(4, 6))-1
	 var _day   = parseInt(date_str.substring(6, 8))
	    
	 return new Date(_year,_month,_day) 
  }	

  //處理發票資料-END
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //處理折讓單資料-START
  function getVoucherCreditMemoMainAndDetails(
    mig_type,
    companyInfo,
    internalIdAry
  ) {
    var _jsonObjAry = []

    try {
      ///////////////////////////////////////////////////////////// 
      var _mainaddress_text = companyInfo.address 
      var _ban = companyInfo.tax_id_number
      var _legalname = companyInfo.be_gui_title
      ////////////////////////////////////////////////////////////
      //this search is ordered by id, taxrate
      var _mySearch = search.load({
        id: _gw_creditmemo_detail_search_id,
      })
      var _filterArray = []
      //_filterArray.push(['itemtype',search.Operator.ISNOTEMPTY, '']);
      _filterArray.push(['mainline', 'is', false])
      _filterArray.push('and')
      _filterArray.push(['CUSTBODY_GW_EVIDENCE_ISSUE_STATUS.custrecord_gw_evidence_status_value', search.Operator.IS, _manual_evidence_status_value])
  
      if (internalIdAry != null) {
        _filterArray.push('and')
        //_filterArray.push(['createdfrom',search.Operator.ANYOF, internalIdAry]);
        _filterArray.push(['createdfrom', 'anyof', internalIdAry])
        //_filterArray.push('and');
        //_filterArray.push([_creditmemo_control_field_id,search.Operator.IS, _creditmemo_unlock_control_field_value]);
        ////////////////////////////////////////////////////////////////
        _filterArray.push('and')
        _filterArray.push(['recordtype', 'is', 'creditmemo'])
        _filterArray.push('and')
        _filterArray.push(['mainline', 'is', false])
        _filterArray.push('and')
        _filterArray.push(['taxline', 'is', false]) //擋稅別科目
        _filterArray.push('and')
        _filterArray.push(['cogs', 'is', false]) //擋庫存及成本科目
        ////////////////////////////////////////////////////////////////
        //擋做過的
        _filterArray.push('and')
        _filterArray.push(['custbody_gw_gui_num_start', search.Operator.ISEMPTY, ''])
        _filterArray.push('and')
        _filterArray.push(['custbody_gw_gui_num_end', search.Operator.ISEMPTY, ''])
        _filterArray.push('and')
        _filterArray.push(['custbody_gw_allowance_num_start', search.Operator.ISEMPTY,''])
        _filterArray.push('and')
        _filterArray.push(['custbody_gw_allowance_num_end', search.Operator.ISEMPTY, ''])
        ////////////////////////////////////////////////////////////////
        _mySearch.filterExpression = _filterArray
        log.debug('_filterArray', JSON.stringify(_filterArray))

        var _checkID = ''
        var _mainJsonObj
        var _discountItemJsonObj
        var _amountJsonObj = {
          salesAmount: 0,
          freeSalesAmount: 0,
          zeroSalesAmount: 0,
          taxType: '1',
          taxRate: 0,
          taxAmount: 0,
          totalAmount: 0,
        }

        var _tax1_item_ary = []
        var _tax2_item_ary = []
        var _tax3_item_ary = []
        var _tax9_item_ary = []
        //////////////////////////////////////////
        //應稅項目
        var _tax1_item_amount = 0
        var _tax1_rate1_item_amount = 0
        var _tax1_rate2_item_amount = 0
        var _tax1_rate5_item_amount = 0
        var _tax1_rate15_item_amount = 0
        var _tax1_rate25_item_amount = 0
        //////////////////////////////////////////
        var _tax2_item_amount = 0
        var _tax3_item_amount = 0
        var _tax9_item_amount = 0

        var _existFlag = false
        _mySearch.run().each(function (result) {
          var _result = JSON.parse(JSON.stringify(result))
          log.debug('Credit Memo Detail Search Result', JSON.stringify(result))
          //1.Main Information
          var _id = _result.id //840
          var _itemtype = _result.values.itemtype //InvtPart+Discount

          if (stringutility.trim(_itemtype) != '') {
            _existFlag = true
            ///////////////////////////////////////////////////////////////////////////////////////////
            //取得資料-START
            var _account_value = '' //54
            var _account_text = '' //4000 Sales
            if (_result.values.account.length != 0) {
              _account_value = _result.values.account[0].value //54
              _account_text = _result.values.account[0].text //4000 Sales
            }

            var _trandate = _result.values.trandate //2020-07-06
            var _postingperiod_value = '' //111
            var _postingperiod_text = '' //Jul 2020
            if (_result.values.postingperiod.length != 0) {
              _postingperiod_value = _result.values.postingperiod[0].value //111
              _postingperiod_text = _result.values.postingperiod[0].text //Jul 2020
            }
            var _taxperiod_value = '' //111;
            var _taxperiod_text = '' //Jul 2020;
            if (_result.values.taxperiod.length != 0) {
              _taxperiod_value = _result.values.taxperiod[0].value //111;
              _taxperiod_text = _result.values.taxperiod[0].text //Jul 2020;
            }

            var _type_value = '' //CustInvc
            var _type_text = '' //Invoice
            if (_result.values.type.length != 0) {
              _type_value = _result.values.type[0].value //CustInvc
              _type_text = _result.values.type[0].text //Invoice
            }
            var _tranid = _result.values.tranid //AZ10000016 documeny ID

            var _entity_value = '' //529
            var _entity_text = '' //11 se06_company公司
            if (_result.values.entity.length != 0) {
              _entity_value = _result.values.entity[0].value //529
              _entity_text = _result.values.entity[0].text //11 se06_company公司
            }

            var _amount = stringutility.convertToFloat(_result.values.amount)
            var _linesequencenumber = _result.values.linesequencenumber //1
            //var _line                  = _result.values.line;			    //1

            var _memo = _result.values['memo'] //雅結~~
            //var _item_salesdescription = _result.values['item.salesdescription']
            var _prodcut_id = ''
			var _prodcut_text = ''
			if (_result.values.item.length != 0) {
				_prodcut_id = _result.values.item[0].value //10519
				_prodcut_text = _result.values.item[0].text //NI20200811000099
			}
            var _item_displayname = _result.values[_ns_item_name_field] //新客戶折扣
            if (_ns_item_name_field=='item.displayname') {
            	_item_displayname = _prodcut_text+_item_displayname
            }
			 
            //if (stringutility.trim(_memo) != '') _item_displayname = _memo

            var _item_salestaxcode_value = '' //5
            var _item_salestaxcode_text = _result.values['taxItem.itemid'] //UNDEF-TW

            var _tax_type = ''
            if (_result.values['taxItem.internalid'].length != 0) {
              _item_salestaxcode_value =
                _result.values['taxItem.internalid'][0].value //5
              //_item_salestaxcode_text  = _result.values['taxItem.internalid'][0].text;  //UNDEF-TW
              //_tax_type = gwconfigure.getGwTaxTypeFromNSTaxCode(_item_salestaxcode_value);
              var _taxObj = getTaxInformation(_item_salestaxcode_value)
              if (typeof _taxObj !== 'undefined') {
                _tax_type = _taxObj.voucher_property_value
              }
            }

            var _item_internalid_value = ''
            if (_result.values['item.internalid'].length != 0) {
              _item_internalid_value =
                _result.values['item.internalid'][0].value //115
              _item_internalid_text = _result.values['item.internalid'][0].text //115
            }

            //var _rate                  = _result.values.rate; //3047.61904762
            var _rate = _result.values.fxrate //3047.61904762

            var _department_value = ''
            var _department_text = ''
            if (_result.values.department.length != 0) {
              _department_value = _result.values['department'][0].value //1
              _department_text = _result.values['department'][0].text //業務1部
            }

            var _class_value = ''
            var _class_text = ''
            if (_result.values.class.length != 0) {
              _class_value = _result.values['class'][0].value //1
              _class_text = _result.values['class'][0].text //業務1部
            }

            var _quantity = _result.values.quantity
            //20210909 walter 預設值設為1
            if (_quantity.trim().length==0)_quantity='1'

            var _taxItem_rate = _result.values['taxItem.rate'] //5.00%

            _taxItem_rate = _taxItem_rate.replace('%', '')
            //var _tax_amount            = (stringutility.convertToFloat(_amount) * stringutility.convertToFloat(_taxItem_rate)/100);
            //var _total_amount          = _amount+_tax_amount;

            ////////////////////////////////////////////////////////////////////////////////////////////////////
            //20201110 walter modify
            //NS 的總稅額
            var _ns_total_tax_amount = stringutility.convertToFloat(
              _result.values.taxtotal
            ) //稅額總計 -5.00
            //NS 的總金額小計
            var _ns_total_sum_amount = stringutility.convertToFloat(
              _result.values.total
            ) //金額總計(含稅)
            //NS 的稅額
            var _ns_item_tax_amount = stringutility.convertToFloat(
              _result.values.taxamount
            ) //稅額總計 -5.00
            //NS 的Item金額小計
            var _ns_item_total_amount = stringutility.convertToFloat(
              _result.values.formulacurrency
            ) //Item金額小計
            ////////////////////////////////////////////////////////////////////////////////////////////////////

            //單位
            var _unitabbreviation = _result.values.unitabbreviation
            //////////////////////////////////////////////////////////////////////////////////////////////////
            //統編
            //var _customer_vatregnumber = _result.values['customer.vatregnumber'];	//99999997
            var _customer_vatregnumber =
              _result.values.custbody_gw_tax_id_number //99999997
            //買方地址 customer.address
            var _buyer_address = _result.values['customer.address']
            var _companyObj = getCustomerRecord(_customer_vatregnumber)
            //_buyer_address  = _companyObj.address;
            //_entity_text    = _companyObj.companyname;
            /**
		    var _email = ''
            if (typeof _companyObj !== 'undefined') {
              _email = _companyObj.email
            }
            */
            var _email = _result.values['customer.email']
			
            _entity_text = _result.values.custbody_gw_gui_title
            _buyer_address = _result.values.custbody_gw_gui_address
            //////////////////////////////////////////////////////////////////////////////////////////////////

            var _random_number = invoiceutility.getRandomNum(1000, 9999)
             
            var _createdfrom_value = ''
            var _createdfrom_text = ''
            if (_result.values['createdfrom'].length != 0) {
              _createdfrom_value = _result.values['createdfrom'][0].value //948
              _createdfrom_text = _result.values['createdfrom'][0].text //Invoice #AZ10000019
            }
            ////////////////////////////////////////////////////////////
            //處理零稅率資訊
            //海關出口單類別
            var _gw_customs_export_category_value = ''
            var _gw_customs_export_category_text = ''
            //適用零稅率規定
            var _gw_applicable_zero_tax_value = ''
            var _gw_applicable_zero_tax_text = ''
            //海關出口號碼
            var _gw_customs_export_no_value = ''
            var _gw_customs_export_no_text = ''
            //輸出或結匯日期
            var _gw_customs_export_date_value = ''
            var _gw_customs_export_date_text = ''
            //通關註記
            var _gw_egui_clearance_mark_value = ''
            var _gw_egui_clearance_mark_text = ''
            //海關出口號碼
            var _gw_customs_export_no = ''
            //輸出或結匯日期
            var _gw_customs_export_date = ''
            if (
              _result.values.custbody_gw_customs_export_category.length != 0
            ) {
              //海關出口單類別
              _gw_customs_export_category_value =
                _result.values.custbody_gw_customs_export_category[0].value //3
              _gw_customs_export_category_text =
                _result.values.custbody_gw_customs_export_category[0].text //D1-課稅區售與或退回保稅倉
              var _temp_ary = _gw_customs_export_category_text.split('-')
              _gw_customs_export_category_text = _temp_ary[0].substr(0, 2)
            }
            if (_result.values.custbody_gw_applicable_zero_tax.length != 0) {
              //適用零稅率規定
              _gw_applicable_zero_tax_value =
                _result.values.custbody_gw_applicable_zero_tax[0].value //5
              _gw_applicable_zero_tax_text =
                _result.values.custbody_gw_applicable_zero_tax[0].text //5-國際間之運輸
              var _temp_ary = _gw_applicable_zero_tax_text.split('-')
              _gw_applicable_zero_tax_text = _temp_ary[0].substr(0, 1)
            }
            if (_result.values.custbody_gw_egui_clearance_mark.length != 0) {
              //通關註記
              _gw_egui_clearance_mark_value =
                _result.values.custbody_gw_egui_clearance_mark[0].value //5
              _gw_egui_clearance_mark_text =
                _result.values.custbody_gw_egui_clearance_mark[0].text //5-國際間之運輸
              var _temp_ary = _gw_egui_clearance_mark_text.split('-')
              _gw_egui_clearance_mark_text = _temp_ary[0].substr(0, 1)
            }
            //海關出口號碼 : AA123456789012
            _gw_customs_export_no = _result.values.custbody_gw_customs_export_no
            //輸出或結匯日期 : 2021/01/22
            _gw_customs_export_date = convertExportDate(
              _result.values.custbody_gw_customs_export_date
            )
            log.debug('_gw_customs_export_date', _gw_customs_export_date)
            /////////////////////////////////////////////////////////////////////////////////////////////////////////
            //載具類別
            var _gw_gui_carrier_type = ''
            if (_result.values.custbody_gw_gui_carrier_type !=null && _result.values.custbody_gw_gui_carrier_type.length != 0) {
		        _gw_gui_carrier_type = _result.values.custbody_gw_gui_carrier_type[0].value   
	        } 
			var _gw_gui_carrier_id_1 = _result.values.custbody_gw_gui_carrier_id_1
			var _gw_gui_carrier_id_2 = _result.values.custbody_gw_gui_carrier_id_2
			//捐贈代碼
			var _gw_gui_donation_code = _result.values.custbody_gw_gui_donation_code
		    
            //取得資料-END
            ///////////////////////////////////////////////////////////////////////////////////////////////////////////

            if (_checkID !== '' && _checkID !== _id) {
              //ID
              //Copy Objct and clear Object
              //_mainJsonObj = shareDiscountAmount(_mainJsonObj); //重新計算折扣分攤

              var _cloneMainJsonObj = JSON.parse(JSON.stringify(_mainJsonObj))
              _jsonObjAry.push(_cloneMainJsonObj)

              _tax1_rate1_item_amount = 0
              _tax1_rate2_item_amount = 0
              _tax1_rate5_item_amount = 0
              _tax1_rate15_item_amount = 0
              _tax1_rate25_item_amount = 0

              //clear detail item
              _tax1_item_ary = []
              _tax2_item_ary = []
              _tax3_item_ary = []
              _tax9_item_ary = []
              //clear amount
              _amountJsonObj = {
                salesAmount: 0,
                freeSalesAmount: 0,
                zeroSalesAmount: 0,
                taxType: '1',
                taxRate: 0,
                taxAmount: 0,
                totalAmount: 0,
              }

              _discountItemJsonObj = null
            }
            _checkID = _id

            var _main_tax_type = _tax_type
            if (mig_type == 'B2C') _main_tax_type = '9'

            //Item
            var _itemJsonObj = {
              description: _item_displayname,
              taxType: _tax_type,
              taxCode: _item_salestaxcode_value,
              taxRate: _taxItem_rate,
              quantity: _quantity,
              unitPrice: _rate,
              itemUnit: _unitabbreviation,
              amount: _amount,
              itemTaxAmount: _ns_item_tax_amount,
              itemTotalAmount: _ns_item_total_amount,
              sequenceNumber: _linesequencenumber,
              itemRemark: '',
              nsDocumentType: 'CREDITMEMO',
              nsDocumentApplyId: _tranid,
              nsDocumentNumber: _tranid,
              nsDocumentItemId: _item_internalid_value,
              nsDocumentItemSeq: _linesequencenumber,
            }
            //discount 不放進來
            if (
              stringutility.trim(_itemtype) != '' 
              //20210908 walter modify => 折扣項目作進Item, 不另外處理
              //&& stringutility.trim(_itemtype) != 'Discount'
            ) {
              if (_tax_type == '1') {
                _tax1_item_ary.push(_itemJsonObj)
              } else if (_tax_type == '2') {
                _tax2_item_ary.push(_itemJsonObj)
              } else if (_tax_type == '3') {
                _tax3_item_ary.push(_itemJsonObj)
              }
            } else if (stringutility.trim(_itemtype) == 'Discount') {
           	  //20210908 walter modify => 折扣項目作進Item, 不另外處理
              //紀錄折扣項目
              //_discountItemJsonObj = JSON.parse(JSON.stringify(_itemJsonObj))
              //_discountItemJsonObj.quantity = '1'
              //_discountItemJsonObj.itemUnit = '筆'
            }

            //MAIN Section
            _mainJsonObj = {
              applyId: _id,
              trandate: _trandate,
              sellerIdentifier: _ban,
              sellerName: _legalname,
              sellerAddress: _mainaddress_text,
              buyerId: _entity_value,
              buyerIdentifier: _customer_vatregnumber,
              buyerName: _entity_text,
              buyerEmail: _email,
              buyerAddress: _buyer_address,
              mig_type: mig_type, 
              carrier_type: _gw_gui_carrier_type,
              carrier_id_1: _gw_gui_carrier_id_1,
              carrier_id_2: _gw_gui_carrier_id_2,
              npo_ban: _gw_gui_donation_code, 
              taxType: _main_tax_type,
              taxRate: stringutility.convertToFloat(_taxItem_rate) / 100,
              department: _department_value,
              classId: _class_value,
              applicable_zero_tax: _gw_applicable_zero_tax_text,
              customs_export_category: _gw_customs_export_category_text,
              customs_export_no: _gw_customs_export_no,
              customs_export_date: _gw_customs_export_date,
              randomNumber: _random_number,
              createdfromId: _createdfrom_value,
              createdfromText: _createdfrom_text,
              tax1ItemAry: _tax1_item_ary,
              tax2ItemAry: _tax2_item_ary,
              tax3ItemAry: _tax3_item_ary,
              tax9ItemAry: _tax9_item_ary,
              discountItem: _discountItemJsonObj,
              tax1Amount: _tax1_item_amount,
              tax1Rate1Amount: _tax1_rate1_item_amount,
              tax1Rate2Amount: _tax1_rate2_item_amount,
              tax1Rate5Amount: _tax1_rate5_item_amount,
              tax1Rate15Amount: _tax1_rate15_item_amount,
              tax1Rate25Amount: _tax1_rate25_item_amount,
              tax2Amount: _tax2_item_amount,
              tax3Amount: _tax3_item_amount,
              tax9Amount: _tax9_item_amount,
              amountObj: _amountJsonObj,
            }

            //AMOUNT Section
            _amountJsonObj.taxType = _main_tax_type
            _amountJsonObj.taxRate =
              stringutility.convertToFloat(_taxItem_rate) / 100
            //_amountJsonObj.taxAmount   += stringutility.convertToFloat(_tax_amount);
            //20201110 walter modify
            _amountJsonObj.taxAmount = stringutility.convertToFloat(
              _ns_total_tax_amount
            )

            if (_tax_type == '1') {
              //1=應稅 [5]
              _tax1_item_amount += stringutility.convertToFloat(_amount)
              _amountJsonObj.salesAmount += stringutility.convertToFloat(
                _amount
              )
              if (stringutility.convertToInt(_taxItem_rate) == 1) {
                _tax1_rate1_item_amount += stringutility.convertToFloat(_amount)
              } else if (stringutility.convertToInt(_taxItem_rate) == 2) {
                _tax1_rate2_item_amount += stringutility.convertToFloat(_amount)
              } else if (stringutility.convertToInt(_taxItem_rate) == 5) {
                _tax1_rate5_item_amount += stringutility.convertToFloat(_amount)
              } else if (stringutility.convertToInt(_taxItem_rate) == 15) {
                _tax1_rate15_item_amount += stringutility.convertToFloat(
                  _amount
                )
              } else if (stringutility.convertToInt(_taxItem_rate) == 25) {
                _tax1_rate25_item_amount += stringutility.convertToFloat(
                  _amount
                )
              }
            } else if (_tax_type == '2') {
              //2=零稅率 [0]
              _tax2_item_amount += stringutility.convertToFloat(_amount)
              _amountJsonObj.zeroSalesAmount += stringutility.convertToFloat(
                _amount
              )
            } else if (_tax_type == '3') {
              //3=免稅 [0]
              _tax3_item_amount += stringutility.convertToFloat(_amount)
              _amountJsonObj.freeSalesAmount += stringutility.convertToFloat(
                _amount
              )
            }

            _mainJsonObj.tax1Amount = _tax1_item_amount
            _mainJsonObj.tax1Rate1Amount = _tax1_rate1_item_amount
            _mainJsonObj.tax1Rate2Amount = _tax1_rate2_item_amount
            _mainJsonObj.tax1Rate5Amount = _tax1_rate5_item_amount
            _mainJsonObj.tax1Rate15Amount = _tax1_rate15_item_amount
            _mainJsonObj.tax1Rate25Amount = _tax1_rate25_item_amount

            _mainJsonObj.tax2Amount = _tax2_item_amount
            _mainJsonObj.tax3Amount = _tax3_item_amount
            /**
               _amountJsonObj.totalAmount = stringutility.convertToFloat(_amountJsonObj.salesAmount)+
               stringutility.convertToFloat(_amountJsonObj.freeSalesAmount)+
               stringutility.convertToFloat(_amountJsonObj.zeroSalesAmount)+
               stringutility.convertToFloat(_amountJsonObj.taxAmount);
               */
            //20201110 walter modify
            _amountJsonObj.totalAmount = _ns_total_sum_amount
          }

          return true
        })

        if (_existFlag === true) {
          //重新計算折扣分攤
          //_mainJsonObj = shareDiscountAmount(_mainJsonObj); //重新計算折扣分攤
          var _cloneMainJsonObj = JSON.parse(JSON.stringify(_mainJsonObj))
          _jsonObjAry.push(_cloneMainJsonObj)
        }
      }

      log.debug('parse creditmemo jsonObjAry', JSON.stringify(_jsonObjAry))
    } catch (e) {
      log.error(e.name, e.message)
    }

    return _jsonObjAry
  }

  //處理折讓單資料-END
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////////////////////////////////////
  //for Test to clean data
  function removeRecord() {
    try {
      ////////////////////////////////////////////////////////////////////
      var _detailSearch = search.create({
        type: _voucher_details_record,
      })

      var _detailFilterArray = []
      _detailFilterArray.push([
        'custrecord_gw_dtl_voucher_type',
        'isnot',
        'XGUI',
      ])
      _detailSearch.filterExpression = _detailFilterArray
      log.debug('Start Delete 明細', 'Start Delete 明細')
      _detailSearch.run().each(function (result) {
        var internalid = result.id
        record.delete({
          type: _voucher_details_record,
          id: internalid,
        })

        return true
      })
      ////////////////////////////////////////////////////////////////////
      log.debug('Start Delete 主檔', 'Start Delete 主檔')
      var _mainSearch = search.create({
        type: _voucher_main_record,
      })

      var _mainFilterArray = []
      _mainFilterArray.push(['custrecord_gw_voucher_type', 'isnot', 'XGUI'])
      _mainSearch.filterExpression = _mainFilterArray
      _mainSearch.run().each(function (result) {
        var internalid = result.id
        record.delete({
          type: _voucher_main_record,
          id: internalid,
        })
        return true
      })
      ////////////////////////////////////////////////////////////////////
      log.debug('Start Apply 主檔', 'Start Delete 主檔')
      var _applySearch = search.create({
        type: _voucher_apply_list_record,
      })

      var _applyFilterArray = []
      _applyFilterArray.push([
        'custrecord_gw_voucher_apply_type',
        'isnot',
        'XGUI',
      ])
      _applySearch.filterExpression = _applyFilterArray
      _applySearch.run().each(function (result) {
        var internalid = result.id
        record.delete({
          type: _voucher_apply_list_record,
          id: internalid,
        })
        return true
      })
      ////////////////////////////////////////////////////////////////////
      var _invoiceSearch = search.create({
        type: search.Type.INVOICE,
      })

      var _invoiceFilterArray = []
      _invoiceFilterArray.push(['account', 'isnot', '-1'])
      _invoiceSearch.filterExpression = _invoiceFilterArray
      _invoiceSearch.run().each(function (result) {
        var internalid = result.id

        var _record = record.load({
          type: search.Type.INVOICE,
          id: parseInt(internalId),
          isDynamic: true,
        })

        _record.setValue({ fieldId: _invoce_control_field_id, value: false })

        try {
          _record.save()
        } catch (e) {
          console.log(e.name + ':' + e.message)
        }
        return true
      })
      ////////////////////////////////////////////////////////////////////
      var _creditmemoSearch = search.create({
        type: search.Type.CREDIT_MEMO,
      })

      var _creditmemoFilterArray = []
      _creditmemoFilterArray.push(['account', 'isnot', '-1'])
      _creditmemoSearch.filterExpression = _creditmemoFilterArray

      _creditmemoSearch.run().each(function (result) {
        var internalid = result.id

        var _record = record.load({
          type: search.Type.CREDIT_MEMO,
          id: parseInt(internalId),
          isDynamic: true,
        })

        _record.setValue({ fieldId: _invoce_control_field_id, value: false })

        try {
          _record.save()
        } catch (e) {
          console.log(e.name + ':' + e.message)
        }
        return true
      })

      log.debug('完成', '完成刪除')
    } catch (e) {
      log.error(e.name, e.message)
    }
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////

  function executeScript(context) {
    //removeRecord();return;
    _allowance_pre_code = invoiceutility.getConfigureValue('ALLOWANCE_GROUP', 'ALLOWANCE_PRE_CODE')
    _ns_item_name_field = invoiceutility.getConfigureValue('ITEM_GROUP', 'ITEM_NAME_FIELD')
    //稅差
    var _tax_diff_balance = stringutility.convertToFloat(
      invoiceutility.getConfigureValue('TAX_GROUP', 'TAX_DIFF_BALANCE')
    )
    //20230324 預先處理
    _egui_gw_dm_mig_type = invoiceutility.getVoucherMigType('EGUI')
    _allowance_gw_dm_mig_type = invoiceutility.getVoucherMigType('ALLOWANCE')

    //1.載入公司資料
    loadAllCustomerRecord()
    //2.載入稅別資料
    loadAllTaxInformation()
    //2.2.載入營業人資料
    loadAllSellerInfo()
    //3.取得待辦項目清單
    var _incoiceIdjAry = getVoucherSingleScheduleToDoList()
    log.debug('get IncoiceIdjAry', JSON.stringify(_incoiceIdjAry))
    //4.處理
    if (_incoiceIdjAry.length != 0) {
      //Load company information
      /**
      var _companyInfo = config.load({
        type: config.Type.COMPANY_INFORMATION,
      })
      */
      //2. 逐筆[批]進行
      var _voucher_type = 'EGUI'
      var _invoice_completed_ids_ary = []
      for (var i = 0; i < _incoiceIdjAry.length; i++) {
        var _obj = _incoiceIdjAry[i]

        //賣方統編
        var _seller = _obj.seller
        var _internalid = _obj.internalid
        var _invoice_type = _obj.invoiceType
        var _mig_type = _obj.migType
        var _open_type = _obj.openType
        var _apply_dept_code = _obj.applyDeptCode
        var _apply_class = _obj.applyClass
        var _invoice_apply_ids = _obj.applyId //放ToDo IDs List
        var _invoice_apply_ary = _invoice_apply_ids.split(',')
        var _need_upload_mig = _obj.needUploadMig //ALL, EGUI, ALLOWANCE, NONE
        var _apply_user_id = _obj.applyUserId

        //2.1. 處理發票
        //取得公司資料
        var _companyInfo = getSellerInfoByBusinessNo(_seller)
        
        //2.1.1. 整理發票資料
        var _invoiceObjAry = getVoucherInvoiceMainAndDetails(
          _mig_type,
          _companyInfo,
          _invoice_apply_ary
        )
        //2.1.2. 存檔=>Main+Details
        var _historyInvoiceObjAry = []
        _voucher_type = 'EGUI'
        _invoice_completed_ids_ary = saveBatchVouchers(
          _open_type,
          _voucher_type,
          _invoice_type,
          _mig_type,
          _apply_dept_code,
          _apply_class,
          _internalid,
          _invoiceObjAry,
          _historyInvoiceObjAry,
          _need_upload_mig,
          _tax_diff_balance,
          _apply_user_id
        )
        log.debug('historyInvoiceObjAry', JSON.stringify(_historyInvoiceObjAry))

        log.debug('open_type', _open_type)
        if (
          _open_type == 'SINGLE-EGUIANDALLOWANCE-SCHEDULE' &&
          _historyInvoiceObjAry.length != 0
        ) {
          //2.2. 處理折讓單
          //2.1.1. 整理折讓單資料
          var _creditMemoObjAry = getVoucherCreditMemoMainAndDetails(
            _mig_type,
            _companyInfo,
            _invoice_apply_ary
          )

          if (_creditMemoObjAry.length != 0) {
            _voucher_type = 'ALLOWANCE'
            saveBatchVouchers(
              _open_type,
              _voucher_type,
              _invoice_type,
              _mig_type,
              _apply_dept_code,
              _apply_class,
              _internalid,
              _creditMemoObjAry,
              _historyInvoiceObjAry,
              _need_upload_mig,
              _tax_diff_balance,
              _apply_user_id
            )
          }
        }
        //3. close task 6點
        closeNSScheduleTask(_internalid, _invoice_completed_ids_ary)
      }
    }
  }

  /////////////////////////////////////////////////////////////////////////////
  //載入公司資料
  function loadAllCustomerRecord() {
    try {
      _companyObjAry = invoiceutility.getAllCustomers()
      /**
         var _customerSearch = search.create({
				type: search.Type.CUSTOMER,
				columns: ['entityid', 'companyname' ,'custentity_gw_tax_id_number' ,'address', 'email']
			}).run().each(function(result) {
				var _internalid = result.id;

				var _entityid = result.getValue({
					name: 'entityid'
				});
				var _name = result.getValue({
					name: 'companyname'
				});
                var _ban = result.getValue({
					name: 'custentity_gw_tax_id_number'
				});
                var _email = result.getValue({
					name: 'email'
				});
                var _address = result.getValue({
					name: 'address'
				});

                var _obj = {
					'internalid':_internalid,
					'entityid':_entityid,
					'ban':_ban,
					'companyname':_name,
					'email':_email,
					'address':_address
				}

				_companyObjAry.push(_obj);

				return true;
			});
         */
    } catch (e) {
      log.error(e.name, e.message)
    }
  }

  //取得公司資料
  function getCustomerRecord(businessNo) {
    var _companyObj
    try {
      if (_companyObjAry != null) {
        for (var i = 0; i < _companyObjAry.length; i++) {
          var _obj = JSON.parse(JSON.stringify(_companyObjAry[i]))
          if (_obj.ban == businessNo) {
            _companyObj = _obj
            break
          }
        }
      }
    } catch (e) {
      log.error(e.name, e.message)
    }
    return _companyObj
  }
  
  /////////////////////////////////////////////////////////////////////////////
  //取得營業人資料 
  function loadAllSellerInfo() { 
	  var _businessSearch = search
		      .create({
		        type: 'customrecord_gw_business_entity',
		        columns: ['custrecord_gw_be_tax_id_number', 'custrecord_gw_be_gui_title', 'custrecord_gw_be_ns_subsidiary', 'custrecord_gw_be_business_address'],
		        //filters: ['custrecord_gw_be_ns_subsidiary', 'is', subsidiary]
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
		        var _be_ns_subsidiary = result.getValue({
		          name: 'custrecord_gw_be_ns_subsidiary',
		        })
		        var _business_address = result.getValue({
		          name: 'custrecord_gw_be_business_address',
		        })
		        
		        var _obj = {
		        	'tax_id_number': _tax_id_number,
		        	'be_gui_title': _be_gui_title,
		        	'subsidiary': _be_ns_subsidiary,
		        	'address': _business_address
		        }
		        
		        _seller_comapny_ary.push(_obj);
		      
		        return true
		      })   
  }
  
  function getSellerInfoByBusinessNo(business_no) { 
	  var _company_obj
	  if (_seller_comapny_ary.length==0) {
		  loadAllSellerInfo();
	  }	
	  log.debug('get all seller_comapny_ary', JSON.stringify(_seller_comapny_ary))
	  for(var i=0;i <_seller_comapny_ary.length; i++) {
		  var _obj = _seller_comapny_ary[i];
		  if (_obj.tax_id_number==business_no) {
			  _company_obj = _obj;
			  break;
		  }
	  }
	   
	  return _company_obj;
  }

  /////////////////////////////////////////////////////////////////////////////

  return {
    execute: executeScript,
  }
})
