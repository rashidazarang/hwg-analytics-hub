export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agreements: {
        Row: {
          AgreementID: string
          AgreementNumber: string | null
          AgreementStatus: string | null
          DealerCost: number | null
          DealerID: string | null
          DealerUUID: string | null
          DocumentURL: string | null
          EffectiveDate: string | null
          ExpireDate: string | null
          HolderEmail: string | null
          HolderFirstName: string | null
          HolderLastName: string | null
          id: string
          IsActive: boolean | null
          Md5: string
          ReserveAmount: number | null
          StatusChangeDate: string | null
          Total: number | null
          Product: string | null
          Option1: string | null
          Option2: string | null
          Option3: string | null
          Option4: string | null
          Option5: string | null
          Option6: string | null
          Option7: string | null
          Option8: string | null
        }
        Insert: {
          AgreementID: string
          AgreementNumber?: string | null
          AgreementStatus?: string | null
          DealerCost?: number | null
          DealerID?: string | null
          DealerUUID?: string | null
          DocumentURL?: string | null
          EffectiveDate?: string | null
          ExpireDate?: string | null
          HolderEmail?: string | null
          HolderFirstName?: string | null
          HolderLastName?: string | null
          id?: string
          IsActive?: boolean | null
          Md5: string
          ReserveAmount?: number | null
          StatusChangeDate?: string | null
          Total?: number | null
          Product?: string | null
          Option1?: string | null
          Option2?: string | null
          Option3?: string | null
          Option4?: string | null
          Option5?: string | null
          Option6?: string | null
          Option7?: string | null
          Option8?: string | null
        }
        Update: {
          AgreementID?: string
          AgreementNumber?: string | null
          AgreementStatus?: string | null
          DealerCost?: number | null
          DealerID?: string | null
          DealerUUID?: string | null
          DocumentURL?: string | null
          EffectiveDate?: string | null
          ExpireDate?: string | null
          HolderEmail?: string | null
          HolderFirstName?: string | null
          HolderLastName?: string | null
          id?: string
          IsActive?: boolean | null
          Md5?: string
          ReserveAmount?: number | null
          StatusChangeDate?: string | null
          Total?: number | null
          Product?: string | null
          Option1?: string | null
          Option2?: string | null
          Option3?: string | null
          Option4?: string | null
          Option5?: string | null
          Option6?: string | null
          Option7?: string | null
          Option8?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agreements_dealeruuid_fkey"
            columns: ["DealerUUID"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["DealerUUID"]
          },
        ]
      }
      claims: {
        Row: {
          AgreementID: string
          Cause: string | null
          CauseID: string | null
          ClaimID: string
          Closed: string | null
          Complaint: string | null
          ComplaintID: string | null
          Correction: string | null
          CorrectionID: string | null
          Deductible: number | null
          id: string
          IncurredDate: string | null
          LastModified: string | null
          ReportedDate: string | null
        }
        Insert: {
          AgreementID: string
          Cause?: string | null
          CauseID?: string | null
          ClaimID: string
          Closed?: string | null
          Complaint?: string | null
          ComplaintID?: string | null
          Correction?: string | null
          CorrectionID?: string | null
          Deductible?: number | null
          id?: string
          IncurredDate?: string | null
          LastModified?: string | null
          ReportedDate?: string | null
        }
        Update: {
          AgreementID?: string
          Cause?: string | null
          CauseID?: string | null
          ClaimID?: string
          Closed?: string | null
          Complaint?: string | null
          ComplaintID?: string | null
          Correction?: string | null
          CorrectionID?: string | null
          Deductible?: number | null
          id?: string
          IncurredDate?: string | null
          LastModified?: string | null
          ReportedDate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "claims_agreementid_fkey"
            columns: ["AgreementID"]
            isOneToOne: false
            referencedRelation: "agreements"
            referencedColumns: ["AgreementID"]
          },
          {
            foreignKeyName: "claims_agreementid_fkey"
            columns: ["AgreementID"]
            isOneToOne: false
            referencedRelation: "contracts_agreements_primary"
            referencedColumns: ["AgreementID"]
          },
        ]
      }
      contracts: {
        Row: {
          agent_nbr: string | null
          Agent_Nbr: string | null
          apr: string | null
          balloon_amount: string | null
          base_acv: string | null
          batch_nbr: string | null
          clip_fee: number | null
          contract_count_in_tec_assured: number | null
          contract_form_nbr: string | null
          contract_holder_address: string | null
          contract_holder_city: string | null
          contract_holder_email: string | null
          contract_holder_ext_1: string | null
          contract_holder_ext_2: string | null
          contract_holder_first_name: string | null
          contract_holder_last_name: string | null
          contract_holder_middle_name: string | null
          contract_holder_mobile_nbr: string | null
          contract_holder_name_title: string | null
          contract_holder_phone_nbr: string | null
          contract_holder_spouse_name: string | null
          contract_holder_state: string | null
          contract_holder_work_nbr: string | null
          contract_holder_zip: string | null
          contract_nbr: string | null
          contract_nbr_alternate: string | null
          contract_sale_date: string | null
          contract_term_mileage: number | null
          contract_term_months: number | null
          creation_stamp: string | null
          crm_duplicate_agreement: boolean | null
          crm_source: string | null
          date_funded: string | null
          daysused: number | null
          deal_type: string | null
          dealer_cost: number | null
          dealer_name: string | null
          dealer_nbr: string | null
          deductible_amount: number | null
          deductible_type: string | null
          do_not_send_to_insurer: boolean | null
          effective_date: string | null
          expire_miles: number | null
          finance_source: string | null
          financed_account_number: string | null
          financed_amount: string | null
          financed_term: string | null
          first_payment_date: string | null
          fortegra_plan_code: string | null
          found_in_finance_company: Json | null
          funding_cancel_date: string | null
          id: string
          in_finance_company: boolean | null
          in_producer_bucket_file: boolean | null
          in_tec_assured: boolean | null
          inception_date: string | null
          incoming_client_filename: string | null
          ins_form_plan_code: string | null
          ins_form_plan_name: string | null
          ins_form_rate_book_id: string | null
          insurance_status: string | null
          job_run: string | null
          language: string | null
          last_modified: string | null
          lienholder_nbr: string | null
          manufacturer_id: string | null
          member_id: string | null
          mfg_mileage: string | null
          mfg_warranty_term: string | null
          model: string | null
          model_year: number | null
          mongo_id: string | null
          monthly_payment: string | null
          monthly_payment_effective_date: string | null
          msrp: string | null
          nada_value: string | null
          net_clip: number | null
          net_reserve: number | null
          new_used: string | null
          new_used_field: string | null
          no_charge_back: string | null
          obligor_fortegra: string | null
          payee_addr1: string | null
          payee_addr2: string | null
          payee_city: string | null
          payee_name: string | null
          payee_state: string | null
          payee_zip: string | null
          payment_option: string | null
          plan_code: string | null
          plan_name: string | null
          premium_amount: number | null
          producer_bucket_total: number | null
          product: string | null
          product_code: string | null
          rate_book_id: string | null
          rate_class: string | null
          refund_amount: number | null
          register_nbr: string | null
          reinsurance_id: string | null
          reserves: number | null
          residual_amount: string | null
          retail_rate: number | null
          returnprorate: number | null
          s_contract_entry_app_name: string | null
          s_lien_address: string | null
          s_lien_address_2: string | null
          s_lien_city: string | null
          s_lien_contract: string | null
          s_lien_fed_tax_id: string | null
          s_lien_name: string | null
          s_lien_phone_nbr: string | null
          s_lien_state: string | null
          s_lien_zip: string | null
          sale_odom: string | null
          sale_total: number | null
          status: string | null
          tec_assured_status: string | null
          termdays: number | null
          tpa: string | null
          vehicle_auto_code: string | null
          vehicle_in_service_date: string | null
          vehicle_purhase_price: string | null
          vehicle_year: number | null
          vin: string | null
        }
        Insert: {
          agent_nbr?: string | null
          Agent_Nbr?: string | null
          apr?: string | null
          balloon_amount?: string | null
          base_acv?: string | null
          batch_nbr?: string | null
          clip_fee?: number | null
          contract_count_in_tec_assured?: number | null
          contract_form_nbr?: string | null
          contract_holder_address?: string | null
          contract_holder_city?: string | null
          contract_holder_email?: string | null
          contract_holder_ext_1?: string | null
          contract_holder_ext_2?: string | null
          contract_holder_first_name?: string | null
          contract_holder_last_name?: string | null
          contract_holder_middle_name?: string | null
          contract_holder_mobile_nbr?: string | null
          contract_holder_name_title?: string | null
          contract_holder_phone_nbr?: string | null
          contract_holder_spouse_name?: string | null
          contract_holder_state?: string | null
          contract_holder_work_nbr?: string | null
          contract_holder_zip?: string | null
          contract_nbr?: string | null
          contract_nbr_alternate?: string | null
          contract_sale_date?: string | null
          contract_term_mileage?: number | null
          contract_term_months?: number | null
          creation_stamp?: string | null
          crm_duplicate_agreement?: boolean | null
          crm_source?: string | null
          date_funded?: string | null
          daysused?: number | null
          deal_type?: string | null
          dealer_cost?: number | null
          dealer_name?: string | null
          dealer_nbr?: string | null
          deductible_amount?: number | null
          deductible_type?: string | null
          do_not_send_to_insurer?: boolean | null
          effective_date?: string | null
          expire_miles?: number | null
          finance_source?: string | null
          financed_account_number?: string | null
          financed_amount?: string | null
          financed_term?: string | null
          first_payment_date?: string | null
          fortegra_plan_code?: string | null
          found_in_finance_company?: Json | null
          funding_cancel_date?: string | null
          id: string
          in_finance_company?: boolean | null
          in_producer_bucket_file?: boolean | null
          in_tec_assured?: boolean | null
          inception_date?: string | null
          incoming_client_filename?: string | null
          ins_form_plan_code?: string | null
          ins_form_plan_name?: string | null
          ins_form_rate_book_id?: string | null
          insurance_status?: string | null
          job_run?: string | null
          language?: string | null
          last_modified?: string | null
          lienholder_nbr?: string | null
          manufacturer_id?: string | null
          member_id?: string | null
          mfg_mileage?: string | null
          mfg_warranty_term?: string | null
          model?: string | null
          model_year?: number | null
          mongo_id?: string | null
          monthly_payment?: string | null
          monthly_payment_effective_date?: string | null
          msrp?: string | null
          nada_value?: string | null
          net_clip?: number | null
          net_reserve?: number | null
          new_used?: string | null
          new_used_field?: string | null
          no_charge_back?: string | null
          obligor_fortegra?: string | null
          payee_addr1?: string | null
          payee_addr2?: string | null
          payee_city?: string | null
          payee_name?: string | null
          payee_state?: string | null
          payee_zip?: string | null
          payment_option?: string | null
          plan_code?: string | null
          plan_name?: string | null
          premium_amount?: number | null
          producer_bucket_total?: number | null
          product?: string | null
          product_code?: string | null
          rate_book_id?: string | null
          rate_class?: string | null
          refund_amount?: number | null
          register_nbr?: string | null
          reinsurance_id?: string | null
          reserves?: number | null
          residual_amount?: string | null
          retail_rate?: number | null
          returnprorate?: number | null
          s_contract_entry_app_name?: string | null
          s_lien_address?: string | null
          s_lien_address_2?: string | null
          s_lien_city?: string | null
          s_lien_contract?: string | null
          s_lien_fed_tax_id?: string | null
          s_lien_name?: string | null
          s_lien_phone_nbr?: string | null
          s_lien_state?: string | null
          s_lien_zip?: string | null
          sale_odom?: string | null
          sale_total?: number | null
          status?: string | null
          tec_assured_status?: string | null
          termdays?: number | null
          tpa?: string | null
          vehicle_auto_code?: string | null
          vehicle_in_service_date?: string | null
          vehicle_purhase_price?: string | null
          vehicle_year?: number | null
          vin?: string | null
        }
        Update: {
          agent_nbr?: string | null
          Agent_Nbr?: string | null
          apr?: string | null
          balloon_amount?: string | null
          base_acv?: string | null
          batch_nbr?: string | null
          clip_fee?: number | null
          contract_count_in_tec_assured?: number | null
          contract_form_nbr?: string | null
          contract_holder_address?: string | null
          contract_holder_city?: string | null
          contract_holder_email?: string | null
          contract_holder_ext_1?: string | null
          contract_holder_ext_2?: string | null
          contract_holder_first_name?: string | null
          contract_holder_last_name?: string | null
          contract_holder_middle_name?: string | null
          contract_holder_mobile_nbr?: string | null
          contract_holder_name_title?: string | null
          contract_holder_phone_nbr?: string | null
          contract_holder_spouse_name?: string | null
          contract_holder_state?: string | null
          contract_holder_work_nbr?: string | null
          contract_holder_zip?: string | null
          contract_nbr?: string | null
          contract_nbr_alternate?: string | null
          contract_sale_date?: string | null
          contract_term_mileage?: number | null
          contract_term_months?: number | null
          creation_stamp?: string | null
          crm_duplicate_agreement?: boolean | null
          crm_source?: string | null
          date_funded?: string | null
          daysused?: number | null
          deal_type?: string | null
          dealer_cost?: number | null
          dealer_name?: string | null
          dealer_nbr?: string | null
          deductible_amount?: number | null
          deductible_type?: string | null
          do_not_send_to_insurer?: boolean | null
          effective_date?: string | null
          expire_miles?: number | null
          finance_source?: string | null
          financed_account_number?: string | null
          financed_amount?: string | null
          financed_term?: string | null
          first_payment_date?: string | null
          fortegra_plan_code?: string | null
          found_in_finance_company?: Json | null
          funding_cancel_date?: string | null
          id?: string
          in_finance_company?: boolean | null
          in_producer_bucket_file?: boolean | null
          in_tec_assured?: boolean | null
          inception_date?: string | null
          incoming_client_filename?: string | null
          ins_form_plan_code?: string | null
          ins_form_plan_name?: string | null
          ins_form_rate_book_id?: string | null
          insurance_status?: string | null
          job_run?: string | null
          language?: string | null
          last_modified?: string | null
          lienholder_nbr?: string | null
          manufacturer_id?: string | null
          member_id?: string | null
          mfg_mileage?: string | null
          mfg_warranty_term?: string | null
          model?: string | null
          model_year?: number | null
          mongo_id?: string | null
          monthly_payment?: string | null
          monthly_payment_effective_date?: string | null
          msrp?: string | null
          nada_value?: string | null
          net_clip?: number | null
          net_reserve?: number | null
          new_used?: string | null
          new_used_field?: string | null
          no_charge_back?: string | null
          obligor_fortegra?: string | null
          payee_addr1?: string | null
          payee_addr2?: string | null
          payee_city?: string | null
          payee_name?: string | null
          payee_state?: string | null
          payee_zip?: string | null
          payment_option?: string | null
          plan_code?: string | null
          plan_name?: string | null
          premium_amount?: number | null
          producer_bucket_total?: number | null
          product?: string | null
          product_code?: string | null
          rate_book_id?: string | null
          rate_class?: string | null
          refund_amount?: number | null
          register_nbr?: string | null
          reinsurance_id?: string | null
          reserves?: number | null
          residual_amount?: string | null
          retail_rate?: number | null
          returnprorate?: number | null
          s_contract_entry_app_name?: string | null
          s_lien_address?: string | null
          s_lien_address_2?: string | null
          s_lien_city?: string | null
          s_lien_contract?: string | null
          s_lien_fed_tax_id?: string | null
          s_lien_name?: string | null
          s_lien_phone_nbr?: string | null
          s_lien_state?: string | null
          s_lien_zip?: string | null
          sale_odom?: string | null
          sale_total?: number | null
          status?: string | null
          tec_assured_status?: string | null
          termdays?: number | null
          tpa?: string | null
          vehicle_auto_code?: string | null
          vehicle_in_service_date?: string | null
          vehicle_purhase_price?: string | null
          vehicle_year?: number | null
          vin?: string | null
        }
        Relationships: []
      }
      dealers: {
        Row: {
          Address: string | null
          City: string | null
          Contact: string | null
          Country: string | null
          DealerUUID: string
          EMail: string | null
          Fax: string | null
          Payee: string | null
          PayeeID: string
          PayeeType: string | null
          Phone: string | null
          PostalCode: string | null
          Region: string | null
        }
        Insert: {
          Address?: string | null
          City?: string | null
          Contact?: string | null
          Country?: string | null
          DealerUUID: string
          EMail?: string | null
          Fax?: string | null
          Payee?: string | null
          PayeeID: string
          PayeeType?: string | null
          Phone?: string | null
          PostalCode?: string | null
          Region?: string | null
        }
        Update: {
          Address?: string | null
          City?: string | null
          Contact?: string | null
          Country?: string | null
          DealerUUID?: string
          EMail?: string | null
          Fax?: string | null
          Payee?: string | null
          PayeeID?: string
          PayeeType?: string | null
          Phone?: string | null
          PostalCode?: string | null
          Region?: string | null
        }
        Relationships: []
      }
      processed_claims_timestamps: {
        Row: {
          ClaimID: string
          LastModified: string | null
        }
        Insert: {
          ClaimID: string
          LastModified?: string | null
        }
        Update: {
          ClaimID?: string
          LastModified?: string | null
        }
        Relationships: []
      }
      processed_md5s: {
        Row: {
          AgreementID: string
          Md5: string
        }
        Insert: {
          AgreementID: string
          Md5: string
        }
        Update: {
          AgreementID?: string
          Md5?: string
        }
        Relationships: []
      }
      option_surcharge_price: {
        Row: {
          id: string
          product: string
          option_name: string
          cost: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product: string
          option_name: string
          cost: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product?: string
          option_name?: string
          cost?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          is_admin: boolean | null
          last_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      contracts_agreements_primary: {
        Row: {
          AgreementID: string | null
          AgreementNumber: string | null
          AgreementStatus: string | null
          DealerCost: number | null
          DealerID: string | null
          DealerUUID: string | null
          DocumentURL: string | null
          EffectiveDate: string | null
          ExpireDate: string | null
          HolderEmail: string | null
          HolderFirstName: string | null
          HolderLastName: string | null
          id: string | null
          IsActive: boolean | null
          Md5: string | null
          ReserveAmount: number | null
          StatusChangeDate: string | null
          Total: number | null
        }
        Insert: {
          AgreementID?: string | null
          AgreementNumber?: string | null
          AgreementStatus?: string | null
          DealerCost?: number | null
          DealerID?: string | null
          DealerUUID?: string | null
          DocumentURL?: string | null
          EffectiveDate?: string | null
          ExpireDate?: string | null
          HolderEmail?: string | null
          HolderFirstName?: string | null
          HolderLastName?: string | null
          id?: string | null
          IsActive?: boolean | null
          Md5?: string | null
          ReserveAmount?: number | null
          StatusChangeDate?: string | null
          Total?: number | null
        }
        Update: {
          AgreementID?: string | null
          AgreementNumber?: string | null
          AgreementStatus?: string | null
          DealerCost?: number | null
          DealerID?: string | null
          DealerUUID?: string | null
          DocumentURL?: string | null
          EffectiveDate?: string | null
          ExpireDate?: string | null
          HolderEmail?: string | null
          HolderFirstName?: string | null
          HolderLastName?: string | null
          id?: string | null
          IsActive?: boolean | null
          Md5?: string | null
          ReserveAmount?: number | null
          StatusChangeDate?: string | null
          Total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agreements_dealeruuid_fkey"
            columns: ["DealerUUID"]
            isOneToOne: false
            referencedRelation: "dealers"
            referencedColumns: ["DealerUUID"]
          },
        ]
      }
    }
    Functions: {
      calculate_revenue_growth: {
        Args: {
          current_start_date: string
          current_end_date: string
          previous_start_date: string
          previous_end_date: string
        }
        Returns: {
          current_revenue: number
          previous_revenue: number
          growth_rate: number
        }[]
      }
      check_auth_setup: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      count_agreements_by_status: {
        Args: {
          from_date: string
          to_date: string
        }
        Returns: {
          status: string
          count: number
        }[]
      }
      delete_duplicate_dealers: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fetch_monthly_agreement_counts: {
        Args: {
          start_date: string
          end_date: string
        }
        Returns: {
          month: string
          total: number
        }[]
      }
      get_agreements_with_revenue: {
        Args: {
          start_date: string
          end_date: string
        }
        Returns: {
          AgreementID: string
          AgreementStatus: string
          DealerUUID: string
          dealers: Json
          revenue: number
        }[]
      }
      get_leaderboard_summary: {
        Args: {
          start_date: string
          end_date: string
        }
        Returns: {
          active_contracts: number
          total_revenue: number
          cancellation_rate: number
          top_dealer: string
          top_agent: string
        }[]
      }
      get_top_agents_by_contracts: {
        Args: {
          start_date: string
          end_date: string
          limit_count?: number
        }
        Returns: {
          agent_name: string
          contracts_closed: number
          total_revenue: number
          cancelled_contracts: number
        }[]
      }
      get_top_dealers_by_revenue:
        | {
            Args: {
              start_date: string
              end_date: string
            }
            Returns: {
              dealer_name: string
              total_contracts: number
              total_revenue: number
              cancelled_contracts: number
            }[]
          }
        | {
            Args: {
              start_date: string
              end_date: string
              limit_count?: number
            }
            Returns: {
              dealer_name: string
              total_contracts: number
              total_revenue: number
              cancelled_contracts: number
            }[]
          },
      set_timezone: {
        Args: {
          timezone_name: string
        }
        Returns: undefined
      }
      get_claims_with_payment_in_date_range: {
        Args: {
          start_date: string;
          end_date: string;
        };
        Returns: {
          ClaimID: string;
        }[];
      };
      get_claims_payment_info: {
        Args: {
          claim_ids: string[];
        };
        Returns: {
          ClaimID: string;
          AgreementID: string;
          totalpaid: number;
          lastpaymentdate: string | null;
        }[];
      };
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
