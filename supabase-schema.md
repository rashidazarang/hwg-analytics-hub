| table_name                   | column_name                    | data_type                   |
| ---------------------------- | ------------------------------ | --------------------------- |
| agreements                   | id                             | uuid                        |
| agreements                   | AgreementID                    | character varying           |
| agreements                   | AgreementNumber                | character varying           |
| agreements                   | DealerID                       | character varying           |
| agreements                   | AgreementStatus                | character varying           |
| agreements                   | ExpireDate                     | timestamp without time zone |
| agreements                   | Md5                            | character varying           |
| agreements                   | StatusChangeDate               | timestamp without time zone |
| agreements                   | HolderFirstName                | character varying           |
| agreements                   | HolderLastName                 | character varying           |
| agreements                   | HolderEmail                    | character varying           |
| agreements                   | DocumentURL                    | text                        |
| agreements                   | Total                          | numeric                     |
| agreements                   | DealerCost                     | numeric                     |
| agreements                   | ReserveAmount                  | numeric                     |
| agreements                   | IsActive                       | boolean                     |
| agreements                   | DealerUUID                     | text                        |
| agreements                   | EffectiveDate                  | timestamp without time zone |
| agreements                   | SerialVIN                      | text                        |
| agreements                   | ProductType                    | text                        |
| agreements                   | Product                        | text                        |
| agreements                   | Option1                        | text                        |
| agreements                   | Option2                        | text                        |
| agreements                   | Option3                        | text                        |
| agreements                   | Option4                        | text                        |
| agreements                   | Option5                        | text                        |
| agreements                   | Option6                        | text                        |
| agreements                   | Option7                        | text                        |
| agreements                   | Option8                        | text                        |
| claims                       | id                             | uuid                        |
| claims                       | ClaimID                        | character varying           |
| claims                       | AgreementID                    | character varying           |
| claims                       | IncurredDate                   | timestamp without time zone |
| claims                       | ReportedDate                   | timestamp without time zone |
| claims                       | Closed                         | timestamp without time zone |
| claims                       | Deductible                     | numeric                     |
| claims                       | Complaint                      | text                        |
| claims                       | Cause                          | text                        |
| claims                       | Correction                     | text                        |
| claims                       | CauseID                        | character varying           |
| claims                       | LastModified                   | timestamp without time zone |
| claims                       | ComplaintID                    | character varying           |
| claims                       | CorrectionID                   | character varying           |
| contracts                    | id                             | text                        |
| contracts                    | crm_source                     | text                        |
| contracts                    | job_run                        | text                        |
| contracts                    | finance_source                 | text                        |
| contracts                    | tpa                            | text                        |
| contracts                    | agent_nbr                      | text                        |
| contracts                    | dealer_nbr                     | text                        |
| contracts                    | dealer_name                    | text                        |
| contracts                    | contract_nbr                   | text                        |
| contracts                    | contract_nbr_alternate         | text                        |
| contracts                    | status                         | text                        |
| contracts                    | insurance_status               | text                        |
| contracts                    | inception_date                 | timestamp without time zone |
| contracts                    | effective_date                 | timestamp without time zone |
| contracts                    | sale_odom                      | text                        |
| contracts                    | contract_form_nbr              | text                        |
| contracts                    | batch_nbr                      | text                        |
| contracts                    | register_nbr                   | text                        |
| contracts                    | contract_holder_name_title     | text                        |
| contracts                    | contract_holder_first_name     | text                        |
| contracts                    | contract_holder_last_name      | text                        |
| contracts                    | contract_holder_middle_name    | text                        |
| contracts                    | contract_holder_spouse_name    | text                        |
| contracts                    | contract_holder_address        | text                        |
| contracts                    | contract_holder_city           | text                        |
| contracts                    | contract_holder_state          | text                        |
| contracts                    | contract_holder_zip            | text                        |
| contracts                    | contract_holder_phone_nbr      | text                        |
| contracts                    | contract_holder_work_nbr       | text                        |
| contracts                    | contract_holder_ext_1          | text                        |
| contracts                    | contract_holder_ext_2          | text                        |
| contracts                    | contract_holder_email          | text                        |
| contracts                    | contract_holder_mobile_nbr     | text                        |
| contracts                    | dealer_cost                    | numeric                     |
| contracts                    | sale_total                     | numeric                     |
| contracts                    | retail_rate                    | numeric                     |
| contracts                    | product_code                   | text                        |
| contracts                    | product                        | text                        |
| contracts                    | rate_class                     | text                        |
| contracts                    | vin                            | text                        |
| contracts                    | model_year                     | integer                     |
| contracts                    | vehicle_year                   | integer                     |
| contracts                    | manufacturer_id                | text                        |
| contracts                    | model                          | text                        |
| contracts                    | expire_miles                   | integer                     |
| contracts                    | contract_term_months           | integer                     |
| contracts                    | contract_term_mileage          | integer                     |
| contracts                    | deductible_amount              | numeric                     |
| contracts                    | deductible_type                | text                        |
| contracts                    | premium_amount                 | numeric                     |
| contracts                    | reserves                       | numeric                     |
| contracts                    | clip_fee                       | numeric                     |
| contracts                    | producer_bucket_total          | numeric                     |
| contracts                    | mfg_warranty_term              | text                        |
| contracts                    | mfg_mileage                    | text                        |
| contracts                    | contract_sale_date             | text                        |
| contracts                    | vehicle_purhase_price          | text                        |
| contracts                    | vehicle_auto_code              | text                        |
| contracts                    | lienholder_nbr                 | text                        |
| contracts                    | reinsurance_id                 | text                        |
| contracts                    | vehicle_in_service_date        | text                        |
| contracts                    | member_id                      | text                        |
| contracts                    | no_charge_back                 | text                        |
| contracts                    | monthly_payment_effective_date | text                        |
| contracts                    | fortegra_plan_code             | text                        |
| contracts                    | rate_book_id                   | text                        |
| contracts                    | new_used                       | text                        |
| contracts                    | plan_name                      | text                        |
| contracts                    | plan_code                      | text                        |
| contracts                    | language                       | text                        |
| contracts                    | s_lien_name                    | text                        |
| contracts                    | s_lien_address                 | text                        |
| contracts                    | s_lien_address_2               | text                        |
| contracts                    | s_lien_city                    | text                        |
| contracts                    | s_lien_state                   | text                        |
| contracts                    | s_lien_zip                     | text                        |
| contracts                    | s_lien_phone_nbr               | text                        |
| contracts                    | s_lien_contract                | text                        |
| contracts                    | s_lien_fed_tax_id              | text                        |
| contracts                    | s_contract_entry_app_name      | text                        |
| contracts                    | payment_option                 | text                        |
| contracts                    | deal_type                      | text                        |
| contracts                    | financed_amount                | text                        |
| contracts                    | apr                            | text                        |
| contracts                    | financed_term                  | text                        |
| contracts                    | monthly_payment                | text                        |
| contracts                    | first_payment_date             | text                        |
| contracts                    | balloon_amount                 | text                        |
| contracts                    | residual_amount                | text                        |
| contracts                    | msrp                           | text                        |
| contracts                    | base_acv                       | text                        |
| contracts                    | nada_value                     | text                        |
| contracts                    | financed_account_number        | text                        |
| contracts                    | incoming_client_filename       | text                        |
| contracts                    | mongo_id                       | text                        |
| contracts                    | ins_form_plan_code             | text                        |
| contracts                    | ins_form_rate_book_id          | text                        |
| contracts                    | ins_form_plan_name             | text                        |
| contracts                    | new_used_field                 | text                        |
| contracts                    | do_not_send_to_insurer         | boolean                     |
| contracts                    | crm_duplicate_agreement        | boolean                     |
| contracts                    | in_producer_bucket_file        | boolean                     |
| contracts                    | in_finance_company             | boolean                     |
| contracts                    | found_in_finance_company       | jsonb                       |
| contracts                    | in_tec_assured                 | boolean                     |
| contracts                    | tec_assured_status             | text                        |
| contracts                    | contract_count_in_tec_assured  | integer                     |
| contracts                    | termdays                       | integer                     |
| contracts                    | daysused                       | integer                     |
| contracts                    | returnprorate                  | integer                     |
| contracts                    | refund_amount                  | numeric                     |
| contracts                    | net_reserve                    | numeric                     |
| contracts                    | net_clip                       | numeric                     |
| contracts                    | funding_cancel_date            | text                        |
| contracts                    | payee_name                     | text                        |
| contracts                    | payee_addr1                    | text                        |
| contracts                    | payee_addr2                    | text                        |
| contracts                    | payee_city                     | text                        |
| contracts                    | payee_state                    | text                        |
| contracts                    | payee_zip                      | text                        |
| contracts                    | date_funded                    | text                        |
| contracts                    | creation_stamp                 | timestamp without time zone |
| contracts                    | last_modified                  | timestamp without time zone |
| contracts                    | obligor_fortegra               | text                        |
| contracts                    | Agent_Nbr                      | text                        |
| contracts_agreements_primary | id                             | uuid                        |
| contracts_agreements_primary | AgreementID                    | character varying           |
| contracts_agreements_primary | AgreementNumber                | character varying           |
| contracts_agreements_primary | DealerID                       | character varying           |
| contracts_agreements_primary | AgreementStatus                | character varying           |
| contracts_agreements_primary | ExpireDate                     | timestamp without time zone |
| contracts_agreements_primary | Md5                            | character varying           |
| contracts_agreements_primary | StatusChangeDate               | timestamp without time zone |
| contracts_agreements_primary | HolderFirstName                | character varying           |
| contracts_agreements_primary | HolderLastName                 | character varying           |
| contracts_agreements_primary | HolderEmail                    | character varying           |
| contracts_agreements_primary | DocumentURL                    | text                        |
| contracts_agreements_primary | Total                          | numeric                     |
| contracts_agreements_primary | DealerCost                     | numeric                     |
| contracts_agreements_primary | ReserveAmount                  | numeric                     |
| contracts_agreements_primary | IsActive                       | boolean                     |
| contracts_agreements_primary | DealerUUID                     | text                        |
| contracts_agreements_primary | EffectiveDate                  | timestamp without time zone |
| dealers                      | DealerUUID                     | text                        |
| dealers                      | PayeeID                        | text                        |
| dealers                      | Payee                          | text                        |
| dealers                      | PayeeType                      | text                        |
| dealers                      | Address                        | text                        |
| dealers                      | City                           | text                        |
| dealers                      | Region                         | text                        |
| dealers                      | Country                        | text                        |
| dealers                      | PostalCode                     | text                        |
| dealers                      | Contact                        | text                        |
| dealers                      | Phone                          | text                        |
| dealers                      | Fax                            | text                        |
| dealers                      | EMail                          | text                        |
| option_surcharge_price       | _id                            | text                        |
| option_surcharge_price       | md5                            | text                        |
| option_surcharge_price       | product                        | text                        |
| option_surcharge_price       | Option                         | text                        |
| option_surcharge_price       | cost                           | numeric                     |
| option_surcharge_price       | mandatory                      | boolean                     |
| option_surcharge_price       | inserted_at                    | timestamp with time zone    |
| option_surcharge_price       | updated_at                     | timestamp with time zone    |
| processed_claims_timestamps  | ClaimID                        | text                        |
| processed_claims_timestamps  | LastModified                   | timestamp without time zone |
| processed_md5s               | AgreementID                    | character varying           |
| processed_md5s               | Md5                            | character varying           |
| profiles                     | id                             | uuid                        |
| profiles                     | email                          | text                        |
| profiles                     | is_admin                       | boolean                     |
| profiles                     | created_at                     | timestamp with time zone    |
| profiles                     | updated_at                     | timestamp with time zone    |
| profiles                     | first_name                     | text                        |
| profiles                     | last_name                      | text                        |
| subclaim_parts               | _id                            | text                        |
| subclaim_parts               | SubClaimID                     | character varying           |
| subclaim_parts               | PartNumber                     | text                        |
| subclaim_parts               | Description                    | text                        |
| subclaim_parts               | Quantity                       | numeric                     |
| subclaim_parts               | job_run                        | uuid                        |
| subclaim_parts               | QuotedPrice                    | numeric                     |
| subclaim_parts               | ApprovedPrice                  | numeric                     |
| subclaim_parts               | PaidPrice                      | numeric                     |
| subclaim_parts               | PartType                       | text                        |
| subclaim_parts               | Md5                            | text                        |
| subclaims                    | _id                            | text                        |
| subclaims                    | Md5                            | text                        |
| subclaims                    | ClaimID                        | character varying           |
| subclaims                    | SubClaimID                     | character varying           |
| subclaims                    | Reference                      | text                        |
| subclaims                    | Status                         | text                        |
| subclaims                    | Created                        | timestamp without time zone |
| subclaims                    | Odometer                       | numeric                     |
| subclaims                    | Closed                         | timestamp without time zone |
| subclaims                    | PayeeID                        | character varying           |
| subclaims                    | Payee                          | text                        |
| subclaims                    | Deductible                     | numeric                     |
| subclaims                    | RepairOrder                    | text                        |
| subclaims                    | Complaint                      | text                        |
| subclaims                    | Cause                          | text                        |
| subclaims                    | Correction                     | text                        |
| subclaims                    | LastModified                   | timestamp without time zone |
| subclaims                    | job_run                        | uuid                        |
| subclaims                    | ServiceWriter                  | text                        |
| subclaims                    | ServiceWriterPhone             | text                        |
| subclaims                    | ApprovalCode                   | text                        |
| subclaims                    | SecurityCode                   | text                        |
| subclaims                    | LicensePlate                   | text                        |
| subclaims                    | ComplaintID                    | character varying           |
| subclaims                    | CauseID                        | character varying           |
| subclaims                    | CorrectionID                   | character varying           |