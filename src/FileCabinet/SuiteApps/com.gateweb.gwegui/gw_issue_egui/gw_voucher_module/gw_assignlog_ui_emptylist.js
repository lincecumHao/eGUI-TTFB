/**
 * @NApiVersion 2.1
 * @NScriptType Suitelet
 * @NModuleScope Public
 */
define(['N/ui/serverWidget', 'N/runtime', 'N/config', 'N/file', '../gw_common_utility/gw_common_invoice_utility', '../gw_common_utility/gw_common_configure', '../gw_common_utility/gw_lib_sl_utility'],
    function(serverWidget, runtime, config, file, invoiceutility, gwconfigure, gwLibSuiteLetUtility) {
		//取得 E0402.xml
		function loadE0402Xml() { 
			var _xml_string = '';
			try { 
			     //E0402 xml path
                 var _gw_mig_e0402_xml_path = gwconfigure.getGwMigE0402XmlPath();
				 
				 if (_gw_mig_e0402_xml_path !== '') _xml_string = file.load(_gw_mig_e0402_xml_path).getContents();	
			 
			} catch(e) {  
				 console.log(e.name+':'+e.message); 		
			} 
			return _xml_string;
	    }
		//之後設成Script的Parameters 
		function createForm(form) { 
		    //Load company Information
			var _companyInfo = config.load({
                type: config.Type.COMPANY_INFORMATION
            });
			var _taxid = _companyInfo.getValue({
                fieldId: 'taxid'
            });
			var _companyname = _companyInfo.getValue({
                fieldId: 'companyname'
            });
			//暫借欄位做統編
			var _ban = _companyInfo.getValue({
                fieldId: 'employerid'
            });  
			var _legalname = _companyInfo.getValue({
                fieldId: 'legalname'
            }); 
			//E0402
			var _e0402_xml_field = form.addField({
			  id: 'custpage_e0402_xml_field',
			  type: serverWidget.FieldType.RICHTEXT,
			  label: 'HIDDEN',
			})
			_e0402_xml_field.updateDisplayType({
			  displayType: serverWidget.FieldDisplayType.HIDDEN,
			})
			_e0402_xml_field.defaultValue = loadE0402Xml();	
			///////////////////////////////////////////////////////////////////////////////////
            //查詢條件
            var _common_info_field_id = form.addFieldGroup({
				id : 'common_info_field_id',
				label : '基本資料'
			}); 			
            //公司別
			var _selectBusinessNo = form.addField({
				id: 'custpage_businessno',
				type: serverWidget.FieldType.SELECT,
				label: '統一編號',
				container : 'common_info_field_id'
			}); 
			_selectBusinessNo.updateLayoutType({
				layoutType: serverWidget.FieldLayoutType.OUTSIDE
			}); 		  
            ///////////////////////////////////////////////////////////////////////////////////
			var currentUserObject = runtime.getCurrentUser()
			var _company_ary = invoiceutility.getBusinessEntitByUserId(currentUserObject)
			gwLibSuiteLetUtility.addBusinessEntitySelectOption(_company_ary, _selectBusinessNo)
    	    ///////////////////////////////////////////////////////////////////////////////////
			//期別
			var _yearmonth_field = form.addField({
				id: 'custpage_year_month',
				type: serverWidget.FieldType.TEXT,
				label: '發票期別',
				container : 'common_info_field_id'
			});
			_yearmonth_field.updateLayoutType({
				layoutType: serverWidget.FieldLayoutType.OUTSIDE
			}); 	
			//////////////////////////////////////////////////////////////
			//查詢狀態
			var _assign_log_field_id = form.addFieldGroup({
				id : 'assign_log_field_id',
				label : '字軌類別條件'
			}); 	
			var _select_common_unused = form.addField({
				id: 'custpage_common_unused',
				type: serverWidget.FieldType.CHECKBOX,
				label: '一般字軌-未使用',
				container : 'assign_log_field_id'
			});
			var _select_common_used = form.addField({
				id: 'custpage_common_used',
				type: serverWidget.FieldType.CHECKBOX,
				label: '一般字軌-使用中',
				container : 'assign_log_field_id'
			});
			var _select_common_finished = form.addField({
				id: 'custpage_common_finished',
				type: serverWidget.FieldType.CHECKBOX,
				label: '一般字軌-已使用完畢',
				container : 'assign_log_field_id'
			});
			var _select_common_void = form.addField({
				id: 'custpage_common_void',
				type: serverWidget.FieldType.CHECKBOX,
				label: '一般字軌-作廢',
				container : 'assign_log_field_id'
			});
			//////////////////////////////////////////////////////////////
			var _select_manual_unused = form.addField({
				id: 'custpage_manual_unused',
				type: serverWidget.FieldType.CHECKBOX,
				label: '外部(不上傳)字軌-未使用',
				container : 'assign_log_field_id'
			});
			_select_manual_unused.updateDisplayType({
			    displayType: serverWidget.FieldDisplayType.HIDDEN
			})
			var _select_manual_used = form.addField({
				id: 'custpage_manual_used',
				type: serverWidget.FieldType.CHECKBOX,
				label: '外部(不上傳)字軌-使用中',
				container : 'assign_log_field_id'
			});
			_select_manual_used.updateDisplayType({
			    displayType: serverWidget.FieldDisplayType.HIDDEN
			})
			var _select_manual_finished = form.addField({
				id: 'custpage_manual_finished',
				type: serverWidget.FieldType.CHECKBOX,
				label: '外部(不上傳)字軌-已使用完畢',
				container : 'assign_log_field_id'
			});
			_select_manual_finished.updateDisplayType({
			    displayType: serverWidget.FieldDisplayType.HIDDEN
			})
			var _select_manual_void = form.addField({
				id: 'custpage_manual_void',
				type: serverWidget.FieldType.CHECKBOX,
				label: '外部(不上傳)字軌-作廢',
				container : 'assign_log_field_id'
			});
			_select_manual_void.updateDisplayType({
			    displayType: serverWidget.FieldDisplayType.HIDDEN
			})
			////////////////////////////////////////////////////////////// 
			//格式代碼
			/**
			var _format_code_field_id = form.addFieldGroup({
				id : 'format_code_field_id',
				label : '字軌及發票格式代碼條件'
			});  
            form.addField({
				id: 'custpage_format_code_31_01',
				type: serverWidget.FieldType.CHECKBOX,
				label: '31:銷項三聯式',
				container : 'format_code_field_id'
			});  
            form.addField({
				id: 'custpage_format_code_31_05',
				type: serverWidget.FieldType.CHECKBOX,
				label: '31:銷項電子計算機統一發票',
				container : 'format_code_field_id'
			});  
            form.addField({
				id: 'custpage_format_code_32_02',
				type: serverWidget.FieldType.CHECKBOX,
				label: '32:銷項二聯式',
				container : 'format_code_field_id'
			});	
            form.addField({
				id: 'custpage_format_code_32_03',
				type: serverWidget.FieldType.CHECKBOX,
				label: '32:銷項二聯式收銀機統一發票',
				container : 'format_code_field_id'
			});		
            form.addField({
				id: 'custpage_format_code_35_06',
				type: serverWidget.FieldType.CHECKBOX,
				label: '35:銷項三聯式收銀機統一發票',
				container : 'format_code_field_id'
			});	 
            form.addField({
				id: 'custpage_format_code_35_07',
				type: serverWidget.FieldType.CHECKBOX,
				label: '35:一般稅額電子發票',
				container : 'format_code_field_id'
			});	
			*/
			var _field_format_code_35_07 = form.addField({
				id: 'custpage_format_code_35_07',
				type: serverWidget.FieldType.CHECKBOX,
				label: '35:一般稅額電子發票' 
			});	
			_field_format_code_35_07.updateDisplayType({
			    displayType: serverWidget.FieldDisplayType.HIDDEN
			})
            ////////////////////////////////////////////////////////////// 
			/**
			var _egui_class_field_id = form.addFieldGroup({
				id : 'egui_class_field_id',
				label : '發票類別條件'
			}); 
            form.addField({
				id: 'custpage_egui_electric',
				type: serverWidget.FieldType.CHECKBOX,
				label: '電子發票',
				container : 'egui_class_field_id'
			});  
            form.addField({
				id: 'custpage_egui_manual',
				type: serverWidget.FieldType.CHECKBOX,
				label: '外部發票',
				container : 'egui_class_field_id'
			});	
            */
            var _field_egui_electric = form.addField({
				id: 'custpage_egui_electric',
				type: serverWidget.FieldType.CHECKBOX,
				label: '外部發票' 
			});	 
			_field_egui_electric.updateDisplayType({
			    displayType: serverWidget.FieldDisplayType.HIDDEN
			})
	        ////////////////////////////////////////////////////////////// 
			form.addButton({				
				id: 'custpage_download_csv_button',
				label: 'download',
				functionName: 'downloadEmptyFile("csv")'
			}); 
			////////////////////////////////////////////////////////////// 
			/** 
			form.addButton({				
				id: 'custpage_upload_xml_button',
				label: '上傳-E0402',
				functionName: 'downloadEmptyFile("xml")'
			}); 
		    */
			////////////////////////////////////////////////////////////// 
			
			form.clientScriptModulePath = './gw_assignlog_ui_searchhelp.js';   
		}
				
        function onRequest(context) { 
		    var form = serverWidget.createForm({
				title: '營業稅申報管理-電子發票空白發票下載'
			});  
			
			createForm(form);	
			
			context.response.writePage(form); 
        }//End onRequest 
			 
        return {
            onRequest: onRequest
        };
    }); 