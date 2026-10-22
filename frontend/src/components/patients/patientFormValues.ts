import type { PatientPayload } from '../../api/patients';
import type { Patient, PatientSex, PatientReferralSource } from '../../types';
import { birthDatePayloadFromInput, dateInputValueFromApi } from '../../utils/dateOnly';
import { maskCPF, maskCEP, maskPhone, onlyDigits } from '../../utils/masks';

export type PatientFormValues = PatientPayload;

export const emptyPatientFormValues: PatientFormValues = {
  name: '',
  email: '',
  phone: '',
  birthDate: '',
  sex: '',
  document: '',
  cep: '',
  addressStreet: '',
  addressNeighborhood: '',
  addressCity: '',
  addressState: '',
  addressNumber: '',
  addressComplement: '',
  notes: '',
  referralSource: '',
  referralSourceOther: '',
};

export function patientToFormValues(patient: Patient): PatientFormValues {
  const savedCep = patient.cep ? onlyDigits(patient.cep) : '';
  return {
    name: patient.name,
    email: patient.email ?? '',
    phone: patient.phone ? maskPhone(patient.phone) : '',
    birthDate: dateInputValueFromApi(patient.birthDate),
    sex: patient.sex ?? '',
    document: patient.document ? maskCPF(patient.document) : '',
    cep: savedCep ? maskCEP(savedCep) : '',
    addressStreet: patient.addressStreet ?? '',
    addressNeighborhood: patient.addressNeighborhood ?? '',
    addressCity: patient.addressCity ?? '',
    addressState: patient.addressState ?? '',
    addressNumber: patient.addressNumber ?? '',
    addressComplement: patient.addressComplement ?? '',
    notes: patient.notes ?? '',
    referralSource: patient.referralSource ?? '',
    referralSourceOther: patient.referralSourceOther ?? '',
  };
}

function buildPatientOptionalFields(
  values: PatientFormValues,
  isEditing: boolean,
): Partial<PatientPayload> {
  const sex = values.sex as PatientSex | '';
  const referralSource = values.referralSource as PatientReferralSource | '';
  const out: Partial<PatientPayload> = {};

  if (isEditing || sex) {
    out.sex = sex || null;
  }

  const trimmedNotes = values.notes?.trim() ?? '';
  if (isEditing) {
    out.notes = trimmedNotes;
  } else if (trimmedNotes) {
    out.notes = trimmedNotes;
  }

  if (referralSource === 'OTHER') {
    out.referralSource = 'OTHER';
    out.referralSourceOther = values.referralSourceOther?.trim() ?? '';
  } else if (isEditing || referralSource) {
    out.referralSource = referralSource || null;
    if (isEditing) {
      out.referralSourceOther = '';
    }
  }

  return out;
}

/** Na edição envia todos os campos de endereço (vazios limpam); na criação só os preenchidos. */
export function buildPatientPayload(values: PatientFormValues, patient?: Patient | null): PatientPayload {
  const cepDigits = onlyDigits(values.cep ?? '');
  return {
    name: values.name,
    ...(values.email ? { email: values.email } : {}),
    ...(values.phone ? { phone: onlyDigits(values.phone) } : {}),
    ...(values.birthDate ? { birthDate: birthDatePayloadFromInput(values.birthDate) } : {}),
    ...(values.document ? { document: onlyDigits(values.document) } : {}),
    ...buildPatientOptionalFields(values, !!patient),
    ...(patient
      ? {
          cep: cepDigits.length === 8 ? cepDigits : '',
          addressStreet: values.addressStreet?.trim() ?? '',
          addressNeighborhood: values.addressNeighborhood?.trim() ?? '',
          addressCity: values.addressCity?.trim() ?? '',
          addressState: values.addressState?.trim() ?? '',
          addressNumber: values.addressNumber?.trim() ?? '',
          addressComplement: values.addressComplement?.trim() ?? '',
        }
      : {
          ...(cepDigits.length === 8 ? { cep: cepDigits } : {}),
          ...(values.addressStreet?.trim()
            ? { addressStreet: values.addressStreet.trim() }
            : {}),
          ...(values.addressNeighborhood?.trim()
            ? { addressNeighborhood: values.addressNeighborhood.trim() }
            : {}),
          ...(values.addressCity?.trim() ? { addressCity: values.addressCity.trim() } : {}),
          ...(values.addressState?.trim()
            ? { addressState: values.addressState.trim() }
            : {}),
          ...(values.addressNumber?.trim()
            ? { addressNumber: values.addressNumber.trim() }
            : {}),
          ...(values.addressComplement?.trim()
            ? { addressComplement: values.addressComplement.trim() }
            : {}),
        }),
  };
}
