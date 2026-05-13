import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Platform, Modal, KeyboardAvoidingView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { scanReceiptWithAI } from '../services/ocrService';
import { OPENROUTER_API_KEY } from '../config/keys';
import DateTimePicker from '@react-native-community/datetimepicker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../context/DataContext';
import { useTheme } from '../context/ThemeContext';
import { colors, spacing, radius, typography } from '../constants/theme';
import { BANCOS, MEDIOS_DE_PAGO, MONEDAS, ETIQUETA_COLORS } from '../constants/catalogos';
import { formatFecha, parseFecha, formatPrecioInputDisplay, formatPrecioLive, getCurrencySymbol } from '../utils/formatters';
import { useModal } from '../hooks/useModal';
import { userService } from '../services/userService';
import { contactService } from '../services/contactService';

const INITIAL = {
  objeto: '', fecha: formatFecha(new Date()),
  medio: '', tipo: 'debito', banco: '',
  cuotas: '1', cantidad: '1', precio: '',
  moneda: 'ARS', etiqueta: '', isFijo: false,
};

export default function AgregarScreen() {
  const { agregarGasto, mydata, actualizarConfig } = useData();
  const { dark } = useTheme();
  const s = styles(dark);
  const navigation = useNavigation();
  const { showModal, modal } = useModal();

  // Medios y bancos disponibles según configuración
  const mediosDisponibles = mydata.mediosHabilitados?.length > 0
    ? mydata.mediosHabilitados
    : MEDIOS_DE_PAGO;
  const bancosDisponibles = mydata.bancosHabilitados?.length > 0
    ? mydata.bancosHabilitados
    : BANCOS;

  const [form, setForm] = useState({
    ...INITIAL,
    medio: mediosDisponibles[0] || '',
    moneda: mydata.monedaPreferida || 'ARS',
  });
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [ocrItems, setOcrItems] = useState([]); // For bulk items
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrCommonData, setOcrCommonData] = useState({});
  const [showCamera, setShowCamera] = useState(false);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [flash, setFlash] = useState('off');
  const cameraRef = useRef(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const set = (key, val) => setForm(prev => {
    const next = { ...prev, [key]: val };
    if (key === 'tipo' && val === 'debito') next.cuotas = '1';
    if (key === 'isFijo' && val) { next.cuotas = '1'; next.cantidad = '1'; }
    return next;
  });

  // Estado del display del precio (lo que ve el usuario: "$ 1.234,56")
  // El form.precio guarda el número limpio ("1234.56") para el backend
  const [precioDisplay, setPrecioDisplay] = useState('');

  const handlePriceChange = (val) => {
    const { display, cleanValue } = formatPrecioLive(val, form.moneda);
    setPrecioDisplay(display);
    set('precio', cleanValue);
  };

  // Cuando cambia la moneda, actualizamos el símbolo en el display
  useEffect(() => {
    if (form.precio) {
      const { display } = formatPrecioLive(
        // Reconstruimos con coma decimal para que formatPrecioLive lo procese bien
        String(form.precio).replace('.', ','),
        form.moneda
      );
      setPrecioDisplay(display);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.moneda]);

  const [sharedUser, setSharedUser] = useState(null);
  const [shareMode, setShareMode] = useState('dividir'); // 'dividir' o 'mismo'
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [recentContacts, setRecentContacts] = useState([]);

  useEffect(() => {
    contactService.getRecent().then(setRecentContacts);
  }, []);

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    try {
      const found = await userService.buscarPorEmail(searchEmail);
      if (found) {
        setSharedUser(found);
        const next = await contactService.saveContact(found);
        setRecentContacts(next);
      } else {
        showModal({ type: 'warning', title: 'No encontrado', message: 'No existe un usuario con ese email.' });
      }
    } catch (err) {
      console.error('Error searching user:', err);
      showModal({ type: 'error', title: 'Error', message: 'Hubo un problema al buscar el usuario.' });
    } finally {
      setSearching(false);
    }
  };

  const handleGuardar = async () => {
    if (!form.objeto.trim()) {
      return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá el objeto del gasto.' });
    }
    if (!form.precio || isNaN(Number(form.precio))) {
      return showModal({ type: 'warning', title: 'Campo requerido', message: 'Ingresá un precio válido.' });
    }

    setLoading(true);
    try {
      const sharedWith = sharedUser ? { userId: sharedUser.id, mode: shareMode } : null;
      
      await agregarGasto({
        ...form,
        cuotas: parseInt(form.cuotas) || 1,
        cantidad: parseInt(form.cantidad) || 1,
        precio: Number(form.precio),
      }, sharedWith);

      setForm({
        ...INITIAL,
        medio: mediosDisponibles[0] || '',
        moneda: mydata.monedaPreferida || 'ARS',
      });
      setPrecioDisplay(''); // Resetear display del precio
      setSharedUser(null);
      setSearchEmail('');
      
      showModal({
        type: 'success',
        title: '¡Guardado!',
        message: 'El gasto fue agregado correctamente.',
        onClose: () => navigation.navigate('Gastos'),
      });
    } catch (err) {
      showModal({ type: 'error', title: 'Error al guardar', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const FIELD_LABELS = { precio: 'Precio', fecha: 'Fecha', medio: 'Medio de pago', tipo: 'Tipo', moneda: 'Moneda', cuotas: 'Cuotas', objeto: 'Objeto' };
  
  const aplicarDatosOCR = (datos) => {
    setForm(prev => {
      const next = { ...prev, ...datos };
      if (datos.tipo === 'debito') next.cuotas = '1';
      return next;
    });
  };

  const processImageBase64 = async (base64Data) => {
    setIsScanning(true);
    try {
      const datos = await scanReceiptWithAI(base64Data, OPENROUTER_API_KEY, mydata.mediosHabilitados);
      
      if (!Object.keys(datos).length) {
        return showModal({ type: 'warning', title: 'Sin datos', message: 'No se detectaron datos útiles.' });
      }

      // If multiple items, show review modal
      if (datos.items?.length > 1) {
        setOcrItems(datos.items);
        const { items, ...common } = datos;
        // Merge AI detected data with current form defaults
        setOcrCommonData({ ...form, ...common });
        setShowOcrModal(true);
      } else {
        // Current behavior for single item
        const camposDetectados = Object.keys(datos).filter(k => k !== 'items').map(k => FIELD_LABELS[k] || k).join(', ');
        const formVacio = !form.objeto && !form.precio;
        if (formVacio) {
          aplicarDatosOCR(datos);
          showModal({ type: 'success', title: 'Datos cargados', message: `Se completaron: ${camposDetectados}.` });
        } else {
          showModal({
            type: 'confirm',
            title: 'Datos detectados',
            message: `Se encontraron: ${camposDetectados}. ¿Sobreescribir el formulario?`,
            confirmText: 'Sobreescribir',
            onConfirm: () => aplicarDatosOCR(datos),
          });
        }
      }
    } catch (err) {
      showModal({ type: 'error', title: 'Error al escanear', message: err.message });
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveBulk = async () => {
    setLoading(true);
    try {
      for (const item of ocrItems) {
        await agregarGasto({
          ...form,
          ...ocrCommonData,
          objeto: item.objeto,
          precio: Number(item.precio),
        });
      }
      setShowOcrModal(false);
      showModal({ 
        type: 'success', 
        title: '¡Guardados!', 
        message: `Se guardaron ${ocrItems.length} gastos correctamente.`,
        onClose: () => navigation.navigate('Gastos')
      });
    } catch (err) {
      showModal({ type: 'error', title: 'Error', message: 'Hubo un problema al guardar los gastos.' });
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (source) => {
    if (!OPENROUTER_API_KEY) {
      return showModal({
        type: 'warning',
        title: 'API no configurada',
        message: 'Agregá tu clave de OpenRouter en src/config/keys.js. Conseguila gratis en openrouter.ai/keys',
      });
    }

    if (source === 'camera') {
      if (!cameraPermission?.granted) {
        const perm = await requestCameraPermission();
        if (!perm.granted) {
          return showModal({ type: 'warning', title: 'Permiso denegado', message: 'Habilitá el acceso a la cámara en Configuración.' });
        }
      }
      setShowCamera(true);
    } else {
      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          return showModal({ type: 'warning', title: 'Permiso denegado', message: 'Habilitá el acceso a la galería en Configuración.' });
        }
        const result = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, base64: true, mediaTypes: ['images'] });
        
        if (!result.canceled && result.assets?.[0]?.uri) {
          // Resize image to max 1024px
          const manipResult = await manipulateAsync(
            result.assets[0].uri,
            [{ resize: { width: 1024 } }],
            { compress: 0.7, format: SaveFormat.JPEG, base64: true }
          );
          processImageBase64(manipResult.base64);
        }
      } catch (e) {
        showModal({ type: 'error', title: 'Error', message: 'No se pudo procesar la imagen.' });
      }
    }
  };

  const handleTakePhoto = async () => {
    if (!cameraRef.current || takingPhoto) return;
    setTakingPhoto(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.7, shutterSound: false });
      setShowCamera(false);
      
      if (photo.uri) {
        const manipResult = await manipulateAsync(
          photo.uri,
          [{ resize: { width: 1024 } }],
          { compress: 0.7, format: SaveFormat.JPEG, base64: true }
        );
        processImageBase64(manipResult.base64);
      }
    } catch (e) {
      showModal({ type: 'error', title: 'Error', message: 'No se pudo tomar la foto.' });
    } finally {
      setTakingPhoto(false);
    }
  };

  const handleScanReceipt = () => {
    showModal({
      type: 'actionsheet',
      title: 'Escanear ticket',
      message: 'Elegí cómo querés cargar la imagen',
      actions: [
        { label: 'Usar cámara', icon: 'camera-outline', onPress: () => pickImage('camera') },
        { label: 'Elegir de galería', icon: 'images-outline', onPress: () => pickImage('gallery') },
      ],
    });
  };

  const handleCrearEtiqueta = async (nuevaEtiqueta) => {
    const etiquetas = [...(mydata.etiquetas || []), nuevaEtiqueta];
    await actualizarConfig({ etiquetas });
  };

  const esCuotasHabilitado = form.tipo === 'credito' && !form.isFijo;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <SafeAreaView style={s.root} edges={['top']}>
        <ScrollView
          contentContainerStyle={s.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="interactive"
        >
        <View style={s.titleRow}>
          <Text style={s.title}>Nuevo gasto</Text>
          <TouchableOpacity style={s.scanBtn} onPress={handleScanReceipt} disabled={isScanning} activeOpacity={0.7}>
            <Ionicons name="scan-outline" size={19} color={colors.primary} />
            <Text style={s.scanBtnText}>Escanear</Text>
          </TouchableOpacity>
        </View>

        <Field label="Tipo de gasto" dark={dark}>
          <FijoSelector value={form.isFijo} onChange={v => set('isFijo', v)} dark={dark} s={s} />
        </Field>

        <Row>
          <Field label="Objeto" dark={dark} flex>
            <TextInput style={s.input} value={form.objeto} onChangeText={v => set('objeto', v)} placeholder="Ej: Zapatillas" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />
          </Field>
          <Field label="Fecha" dark={dark} flex>
            <DatePickerField
              value={form.fecha}
              onChange={v => set('fecha', v)}
              dark={dark}
              s={s}
            />
          </Field>
        </Row>

        <Row>
          <Field label="Medio de pago" dark={dark} flex>
            <SelectRow options={mediosDisponibles} value={form.medio} onChange={v => set('medio', v)} dark={dark} style={s.input} />
          </Field>
          <Field label="Banco" dark={dark} flex>
            <SelectRow options={['', ...bancosDisponibles]} value={form.banco} onChange={v => set('banco', v)} dark={dark} style={s.input} placeholder="Sin banco" />
          </Field>
        </Row>

        <Row>
          <Field label="Moneda" dark={dark} flex>
            <SelectRow options={MONEDAS.map(m => m.codigo)} value={form.moneda} onChange={v => set('moneda', v)} dark={dark} style={s.input} />
          </Field>
          <Field label="Precio" dark={dark} flex>
            <TextInput
              style={s.input}
              value={precioDisplay}
              onChangeText={handlePriceChange}
              placeholder={`${getCurrencySymbol(form.moneda)} 0,00`}
              placeholderTextColor={dark ? '#475569' : '#94A3B8'}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
          </Field>
        </Row>

        {form.isFijo && (
          <Row>
            <Field label="Rep en el mes" dark={dark} flex>
              <TextInput style={s.input} value={form.cantidad} onChangeText={v => set('cantidad', v)} keyboardType="number-pad" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />
            </Field>
            <Field label="Periodo en meses" dark={dark} flex>
              <TextInput style={s.input} value={form.cuotas} onChangeText={v => set('cuotas', v)} keyboardType="number-pad" placeholderTextColor={dark ? '#475569' : '#94A3B8'} />
            </Field>
          </Row>
        )}

        {!form.isFijo && (
          <Field label="Tipo de pago" dark={dark}>
            <TipoSelector value={form.tipo} onChange={v => set('tipo', v)} dark={dark} s={s} />
          </Field>
        )}

        {esCuotasHabilitado && (
          <Field label="Cuotas" dark={dark}>
            <CuotasSelector
              value={form.cuotas}
              onChange={v => set('cuotas', v)}
              dark={dark}
              s={s}
            />
          </Field>
        )}

        <Field label="Etiqueta" dark={dark}>
          <EtiquetaSelector
            value={form.etiqueta}
            onChange={v => set('etiqueta', v)}
            etiquetas={mydata.etiquetas || []}
            onCrearEtiqueta={handleCrearEtiqueta}
            dark={dark}
            s={s}
          />
        </Field>

        {/* Compartir Gasto */}
        <View style={s.shareCard}>
          <Text style={s.shareTitle}>Compartir gasto</Text>
          {!sharedUser ? (
            <View style={s.row}>
              <TextInput
                style={[s.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Email del contacto..."
                placeholderTextColor={dark ? '#475569' : '#94A3B8'}
                value={searchEmail}
                onChangeText={setSearchEmail}
                autoCapitalize="none"
              />
              <TouchableOpacity style={s.searchBtn} onPress={handleSearchUser} disabled={searching}>
                {searching ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="search" size={20} color="#fff" />}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.sharedInfo}>
              <View style={s.userInfo}>
                <View style={s.miniAvatar}><Text style={s.miniAvatarText}>{sharedUser.nombre?.[0] || '?'}</Text></View>
                <Text style={s.userName}>{sharedUser.nombre || sharedUser.email}</Text>
              </View>
              <TouchableOpacity onPress={() => setSharedUser(null)}><Ionicons name="close-circle" size={20} color={colors.error} /></TouchableOpacity>
            </View>
          )}

          {!sharedUser && recentContacts.length > 0 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
              {recentContacts.map(c => (
                <TouchableOpacity key={c.id} style={s.recentPill} onPress={() => setSharedUser(c)}>
                  <Text style={s.recentPillText}>{c.nombre || c.email.split('@')[0]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {sharedUser && (
            <View style={s.modeRow}>
              <TouchableOpacity 
                style={[s.modeBtn, shareMode === 'dividir' && s.modeBtnActive]} 
                onPress={() => setShareMode('dividir')}
              >
                <Text style={[s.modeBtnText, shareMode === 'dividir' && s.modeBtnTextActive]}>Dividir entre 2</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[s.modeBtn, shareMode === 'mismo' && s.modeBtnActive]} 
                onPress={() => setShareMode('mismo')}
              >
                <Text style={[s.modeBtnText, shareMode === 'mismo' && s.modeBtnTextActive]}>Mismo monto</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity style={s.btn} onPress={handleGuardar} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={s.btnText}>Guardar gasto</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {isScanning && (
        <View style={s.scanOverlay}>
          <View style={s.scanOverlayCard}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={s.scanOverlayText}>Analizando ticket...</Text>
          </View>
        </View>
      )}

      {showCamera && (
        <Modal visible={showCamera} animationType="slide" transparent={false}>
          <View style={{ flex: 1, backgroundColor: '#000' }}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              ref={cameraRef}
              flash={flash}
              mute={true}
              animateShutter={false}
            />
            <View style={{ flex: 1, justifyContent: 'space-between', padding: spacing.xl, paddingVertical: 60 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setShowCamera(false)} style={{ padding: 8, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radius.full }}>
                  <Ionicons name="close" size={28} color="#fff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  onPress={() => setFlash(f => f === 'off' ? 'on' : 'off')} 
                  style={{ padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: radius.full }}
                >
                  <Ionicons name={flash === 'on' ? 'flash' : 'flash-off'} size={24} color={flash === 'on' ? '#FFD700' : '#fff'} />
                </TouchableOpacity>
              </View>
              
              <View style={{ alignSelf: 'center', alignItems: 'center' }}>
                <View style={{ width: 280, height: 400, borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', borderRadius: radius.lg, borderStyle: 'dashed', marginBottom: 40, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', ...typography.captionMed }}>Enfocá el ticket acá</Text>
                </View>
                
                <TouchableOpacity 
                  onPress={handleTakePhoto} 
                  disabled={takingPhoto}
                  style={{ width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center' }}
                >
                  <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' }}>
                    {takingPhoto && <ActivityIndicator color="#000" />}
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      {/* Modal de Revisión de Items (Bulk OCR) */}
      <Modal visible={showOcrModal} animationType="slide" transparent={true}>
        <View style={s.bulkOverlay}>
          <View style={s.bulkContent}>
            <View style={s.bulkHeader}>
              <Text style={s.bulkTitle}>Gastos detectados</Text>
              <TouchableOpacity onPress={() => setShowOcrModal(false)}>
                <Ionicons name="close" size={24} color={dark ? colors.text.dark : colors.text.light} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={s.bulkList} contentContainerStyle={{ paddingBottom: spacing.lg }} keyboardShouldPersistTaps="handled">
              <Text style={s.bulkSubtitle}>Revisá los productos y configurá los datos comunes</Text>
              
              <View style={s.bulkCommonSection}>
                <Row>
                  <Field label="Medio de pago" dark={dark} flex>
                    <SelectRow 
                      options={mediosDisponibles} 
                      value={ocrCommonData.medio} 
                      onChange={v => setOcrCommonData(p => ({ ...p, medio: v }))} 
                      dark={dark} 
                      style={[s.input, { paddingVertical: 8 }]} 
                    />
                  </Field>
                  <Field label="Banco" dark={dark} flex>
                    <SelectRow 
                      options={['', ...bancosDisponibles]} 
                      value={ocrCommonData.banco} 
                      onChange={v => setOcrCommonData(p => ({ ...p, banco: v }))} 
                      dark={dark} 
                      style={[s.input, { paddingVertical: 8 }]} 
                      placeholder="Sin banco"
                    />
                  </Field>
                </Row>

                <View style={{ marginTop: 10 }}>
                  <View style={s.bulkFieldItem}>
                    <Text style={s.label}>Tipo de pago</Text>
                    <TipoSelector 
                      value={ocrCommonData.tipo} 
                      onChange={v => setOcrCommonData(p => ({ ...p, tipo: v, cuotas: v === 'debito' ? '1' : p.cuotas }))} 
                      dark={dark} 
                      s={s} 
                    />
                  </View>
                  {ocrCommonData.tipo === 'credito' && (
                    <View style={[s.bulkFieldItem, { marginTop: 12 }] }>
                      <Text style={s.label}>Cuotas</Text>
                      <CuotasSelector 
                        value={ocrCommonData.cuotas} 
                        onChange={v => setOcrCommonData(p => ({ ...p, cuotas: v }))} 
                        dark={dark} 
                        s={s} 
                      />
                    </View>
                  )}
                </View>
              </View>

              {ocrItems.map((item, idx) => (
                <View key={idx} style={s.bulkItem}>
                  <TextInput 
                    style={[s.input, { flex: 2, marginBottom: 0 }]} 
                    value={item.objeto} 
                    onChangeText={(v) => {
                      const next = [...ocrItems];
                      next[idx].objeto = v;
                      setOcrItems(next);
                    }}
                  />
                  <TextInput 
                    style={[s.input, { flex: 1, marginBottom: 0 }]} 
                    value={item.precio} 
                    keyboardType="decimal-pad"
                    onChangeText={(v) => {
                      const next = [...ocrItems];
                      next[idx].precio = v;
                      setOcrItems(next);
                    }}
                  />
                  <TouchableOpacity onPress={() => setOcrItems(prev => prev.filter((_, i) => i !== idx))}>
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <View style={s.bulkFooter}>
              <TouchableOpacity 
                style={[s.btn, { flex: 1, backgroundColor: dark ? '#1e293b' : '#f1f5f9' }]} 
                onPress={() => {
                  const total = ocrItems.reduce((acc, curr) => acc + Number(curr.precio), 0);
                  const { items, ...common } = ocrCommonData;
                  aplicarDatosOCR({ ...common, precio: String(total) });
                  setShowOcrModal(false);
                }}
              >
                <Text style={[s.btnText, { color: colors.primary }]}>Juntar todo</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[s.btn, { flex: 1.5 }]} onPress={handleSaveBulk} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.btnText}>Guardar {ocrItems.length} gastos</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {modal}
    </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function DatePickerField({ value, onChange, dark, s }) {
  const [show, setShow] = useState(false);
  const dateObj = (() => {
    const d = parseFecha(value);
    return isNaN(d) ? new Date() : d;
  })();

  const handleChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setShow(false);
    if (selectedDate) onChange(formatFecha(selectedDate));
  };

  return (
    <View>
      <TouchableOpacity style={[s.input, s.dateBtn]} onPress={() => setShow(true)} activeOpacity={0.7}>
        <Ionicons name="calendar-outline" size={16} color={dark ? colors.textSecondary.dark : colors.textSecondary.light} />
        <Text style={s.dateBtnText}>{value || 'Seleccionar fecha'}</Text>
      </TouchableOpacity>

      {Platform.OS === 'android' && show && (
        <DateTimePicker
          value={dateObj}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}

      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={s.dateModalBg}>
            <View style={s.dateModalCard}>
              <View style={s.dateModalHeader}>
                <Text style={s.dateModalTitle}>Seleccionar fecha</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={s.dateModalDone}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateObj}
                mode="date"
                display="spinner"
                onChange={handleChange}
                textColor={dark ? colors.text.dark : colors.text.light}
                locale="es-AR"
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const CUOTAS_PRESETS = [1, 3, 6, 12, 18, 24];

function CuotasSelector({ value, onChange, dark, s }) {
  const numVal = parseInt(value) || 1;
  const [showCustom, setShowCustom] = useState(!CUOTAS_PRESETS.includes(numVal));

  const handlePreset = (c) => {
    setShowCustom(false);
    onChange(String(c));
  };

  const handleCustomToggle = () => {
    setShowCustom(true);
    onChange('');
  };

  return (
    <View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {CUOTAS_PRESETS.map(c => {
          const activo = !showCustom && numVal === c;
          return (
            <TouchableOpacity
              key={c}
              style={[s.cuotasPill, activo && s.cuotasPillActive]}
              onPress={() => handlePreset(c)}
              activeOpacity={0.7}
            >
              <Text style={[s.cuotasPillText, activo && s.cuotasPillTextActive]}>{c}x</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[s.cuotasPill, showCustom && s.cuotasPillActive]}
          onPress={handleCustomToggle}
          activeOpacity={0.7}
        >
          <Text style={[s.cuotasPillText, showCustom && s.cuotasPillTextActive]}>Otro</Text>
        </TouchableOpacity>
      </View>
      {showCustom && (
        <TextInput
          style={[s.input, { marginTop: 8 }]}
          value={value}
          onChangeText={onChange}
          keyboardType="number-pad"
          placeholder="Ej: 9"
          placeholderTextColor={dark ? '#475569' : '#94A3B8'}
          autoFocus
        />
      )}
    </View>
  );
}

function TipoSelector({ value, onChange, dark, s }) {
  const opciones = [
    { key: 'debito', label: 'Débito', icon: 'card-outline' },
    { key: 'credito', label: 'Crédito', icon: 'wallet-outline' },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {opciones.map(op => {
        const activo = value === op.key;
        return (
          <TouchableOpacity
            key={op.key}
            style={[s.tipoBtn, activo && s.tipoBtnActive]}
            onPress={() => onChange(op.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={op.icon}
              size={18}
              color={activo ? '#fff' : (dark ? colors.textSecondary.dark : colors.textSecondary.light)}
            />
            <Text style={[s.tipoBtnText, activo && s.tipoBtnTextActive]}>{op.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FijoSelector({ value, onChange, dark, s }) {
  const opciones = [
    { key: false, label: 'Normal', icon: 'flash-outline' },
    { key: true, label: 'Fijo', icon: 'repeat-outline' },
  ];
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      {opciones.map(op => {
        const activo = value === op.key;
        return (
          <TouchableOpacity
            key={String(op.key)}
            style={[s.tipoBtn, activo && s.tipoBtnActive]}
            onPress={() => onChange(op.key)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={op.icon}
              size={18}
              color={activo ? '#fff' : (dark ? colors.textSecondary.dark : colors.textSecondary.light)}
            />
            <Text style={[s.tipoBtnText, activo && s.tipoBtnTextActive]}>{op.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function EtiquetaSelector({ value, onChange, etiquetas, onCrearEtiqueta, dark, s }) {
  const [creando, setCreando] = useState(false);
  const [nueva, setNueva] = useState('');
  const [colorSel, setColorSel] = useState(ETIQUETA_COLORS[0]);
  const [savingTag, setSavingTag] = useState(false);

  const handleCrear = async () => {
    const trimmed = nueva.trim();
    if (!trimmed) return;
    setSavingTag(true);
    try {
      await onCrearEtiqueta({ nombre: trimmed, color: colorSel });
      onChange(trimmed);
      setNueva('');
      setCreando(false);
    } catch {
    } finally {
      setSavingTag(false);
    }
  };

  return (
    <View>
      <View style={s.tagsWrap}>
        {etiquetas.map(tag => {
          const nombre = typeof tag === 'string' ? tag : tag.nombre;
          const color = typeof tag === 'string' ? colors.primary : tag.color;
          const activo = value === nombre;
          return (
            <TouchableOpacity
              key={nombre}
              style={[s.tag, { borderColor: color, backgroundColor: activo ? color : color + '20' }]}
              onPress={() => onChange(activo ? '' : nombre)}
            >
              <Text style={[s.tagText, { color: activo ? '#fff' : color }]}>{nombre}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity style={s.tagAdd} onPress={() => setCreando(v => !v)}>
          <Ionicons name={creando ? 'close' : 'add'} size={14} color={colors.primary} />
          <Text style={s.tagAddText}>Nueva</Text>
        </TouchableOpacity>
      </View>
      {creando && (
        <>
          <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={nueva}
              onChangeText={setNueva}
              placeholder="Nombre de etiqueta"
              placeholderTextColor={dark ? '#475569' : '#94A3B8'}
              autoFocus
              onSubmitEditing={handleCrear}
            />
            <TouchableOpacity style={[s.tagSaveBtn, { backgroundColor: colorSel }]} onPress={handleCrear} disabled={savingTag}>
              {savingTag ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.tagSaveBtnText}>Agregar</Text>}
            </TouchableOpacity>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm }}>
            {ETIQUETA_COLORS.map(c => (
              <TouchableOpacity
                key={c}
                style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: c, borderWidth: colorSel === c ? 3 : 1, borderColor: colorSel === c ? (dark ? '#fff' : '#1E293B') : c }}
                onPress={() => setColorSel(c)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function Field({ label, children, dark, flex }) {
  return (
    <View style={[{ marginBottom: spacing.md }, flex && { flex: 1 }]}>
      <Text style={{ ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function Row({ children }) {
  return <View style={{ flexDirection: 'row', gap: spacing.sm }}>{children}</View>;
}

function SelectRow({ options, value, onChange, dark, style, placeholder }) {
  const [open, setOpen] = useState(false);
  const s = StyleSheet.create({
    btn: { ...style, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    val: { ...typography.body, color: value ? (dark ? colors.text.dark : colors.text.light) : (dark ? '#475569' : '#94A3B8') },
    dropdown: { backgroundColor: dark ? colors.surface.dark : '#fff', borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, borderRadius: radius.md, marginTop: 4, maxHeight: 200, zIndex: 20, elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
    opt: { paddingHorizontal: spacing.md, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: dark ? colors.border.dark : colors.border.light },
    optTxt: { ...typography.body, color: dark ? colors.text.dark : colors.text.light },
    selTxt: { color: colors.primary, fontWeight: '600' },
  });

  return (
    <View>
      <TouchableOpacity style={s.btn} onPress={() => setOpen(o => !o)}>
        <Text style={s.val}>{value || placeholder || 'Seleccionar'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={dark ? colors.textSecondary.dark : colors.textSecondary.light} />
      </TouchableOpacity>
      {open && (
        <ScrollView style={s.dropdown} nestedScrollEnabled>
          {options.map(opt => (
            <TouchableOpacity key={opt} style={s.opt} onPress={() => { onChange(opt); setOpen(false); }}>
              <Text style={[s.optTxt, opt === value && s.selTxt]}>{opt || placeholder || '—'}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = (dark) => StyleSheet.create({
  root: { flex: 1, backgroundColor: dark ? colors.background.dark : colors.background.light },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  row: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  title: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '14',
  },
  scanBtnText: { ...typography.captionMed, color: colors.primary, fontWeight: '600' },
  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  scanOverlayCard: {
    backgroundColor: dark ? colors.surface.dark : '#fff',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  scanOverlayText: { ...typography.bodyMed, color: dark ? colors.text.dark : colors.text.light },
  input: {
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    ...typography.body,
    color: dark ? colors.text.dark : colors.text.light,
  },
  tipoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
  },
  tipoBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tipoBtnText: {
    ...typography.bodyMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
  },
  tipoBtnTextActive: {
    color: '#fff',
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
  },
  tagActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tagText: {
    ...typography.captionMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
  },
  tagTextActive: {
    color: '#fff',
  },
  tagAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  tagAddText: {
    ...typography.captionMed,
    color: colors.primary,
  },
  tagSaveBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 80,
  },
  tagSaveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  shareCard: {
    backgroundColor: dark ? colors.surface.dark : '#fff',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    marginBottom: spacing.lg,
  },
  shareTitle: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: spacing.sm, textTransform: 'uppercase' },
  searchBtn: { backgroundColor: colors.primary, borderRadius: radius.md, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  sharedInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: dark ? '#0F172A' : '#F8FAFC', padding: 10, borderRadius: radius.md },
  userInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  miniAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  miniAvatarText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  userName: { ...typography.bodyMed, color: dark ? colors.text.dark : colors.text.light },
  modeRow: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  modeBtnText: { ...typography.captionMed, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  modeBtnTextActive: { color: '#fff', fontWeight: '600' },
  recentPill: { backgroundColor: dark ? '#1e293b' : '#F1F5F9', paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: dark ? colors.border.dark : colors.border.light },
  recentPillText: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  cuotasPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 42,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    backgroundColor: dark ? '#0F172A' : '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cuotasPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  bulkFieldRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    alignItems: 'flex-start',
  },
  bulkFieldItem: {
    width: '100%',
  },
  cuotasPillText: {
    ...typography.captionMed,
    color: dark ? colors.textSecondary.dark : colors.textSecondary.light,
  },
  cuotasPillTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dateBtnText: {
    ...typography.body,
    color: dark ? colors.text.dark : colors.text.light,
    flex: 1,
  },
  dateModalBg: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dateModalCard: {
    backgroundColor: dark ? colors.surface.dark : '#fff',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: 34,
  },
  dateModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: dark ? colors.border.dark : colors.border.light,
  },
  dateModalTitle: {
    ...typography.bodyMed,
    color: dark ? colors.text.dark : colors.text.light,
  },
  dateModalDone: {
    ...typography.bodyMed,
    color: colors.primary,
    fontWeight: '600',
  },
  bulkOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bulkContent: { 
    backgroundColor: dark ? colors.background.dark : colors.background.light, 
    borderTopLeftRadius: radius.xl, 
    borderTopRightRadius: radius.xl, 
    padding: spacing.md, 
    height: '75%' 
  },
  bulkHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  bulkTitle: { ...typography.h2, color: dark ? colors.text.dark : colors.text.light },
  bulkSubtitle: { ...typography.body, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: spacing.md },
  bulkList: { flex: 1 },
  bulkItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  bulkFooter: { flexDirection: 'row', gap: 10, marginTop: spacing.md, paddingBottom: 20 },
  bulkCommonSection: {
    backgroundColor: dark ? '#1e293b' : '#f8fafc',
    padding: spacing.sm,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
  },
  label: { ...typography.caption, color: dark ? colors.textSecondary.dark : colors.textSecondary.light, marginBottom: 4, fontWeight: '600' },
  miniTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: dark ? colors.border.dark : colors.border.light,
    alignItems: 'center',
    backgroundColor: dark ? '#0f172a' : '#fff',
  },
  miniTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  miniTabText: { fontSize: 11, color: dark ? colors.textSecondary.dark : colors.textSecondary.light },
  miniTabTextActive: { color: '#fff', fontWeight: '700' },
});
