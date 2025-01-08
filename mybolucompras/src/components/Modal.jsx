import React from 'react';
import { IoArrowBackCircle } from "react-icons/io5";
import { TextField, Select, MenuItem, InputLabel, FormControl, Button, InputAdornment } from '@mui/material';
import "../App.css";
import Dashboard from './Dashboard';

function Modal({ data, formData, setFormData, mydata, setMyData, handleSubmit, handleDelete, handleEdit, setModalVisible, handleCloseModal, handleChangeVencimiento, handleAgregarFondos, modalType }) {
  const renderCommonFields = () => (
    <>
      <TextField
        label="Objeto"
        variant="outlined"
        value={formData.objeto}
        onChange={(e) => setFormData({ ...formData, objeto: e.target.value })}
        required
        fullWidth={false}
        margin="normal"
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'white',
            '& fieldset': {
              borderColor: '#777777',
              color: '#777777',
            },
            '&:hover fieldset': {
              borderColor: '#777777',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#777777',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'black',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'black',
          },
        }}
      />
      <TextField
        label="Fecha de compra"
        type="date"
        variant="outlined"
        value={formData.fecha}
        onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
        required
        fullWidth={false}
        margin="normal"
        InputLabelProps={{
          shrink: true,
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'white',
            '& fieldset': {
              borderColor: '#777777',
              color: '#777777',
            },
            '&:hover fieldset': {
              borderColor: '#777777',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#777777',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'black',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'black',
          },
        }}
      />
      <FormControl variant="outlined" fullWidth={false} margin="normal" sx={{
        '& .MuiOutlinedInput-root': {
          backgroundColor: 'white',
          '& fieldset': {
            borderColor: '#777777',
            color: '#777777',
          },
          '&:hover fieldset': {
            borderColor: '#777777',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#777777',
          },
        },
        '& .MuiInputLabel-root': {
          color: 'black',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: 'black',
        },
      }}>
        <InputLabel>Medio de pago</InputLabel>
        <Select
          value={formData.medio}
          onChange={(e) => setFormData({ ...formData, medio: e.target.value })}
          label="Medio de pago"
          required
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: 'white',
              '& fieldset': {
                borderColor: '#777777',
                color: '#777777',
              },
              '&:hover fieldset': {
                borderColor: '#777777',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#777777',
              },
            },
            '& .MuiInputLabel-root': {
              color: 'black',
            },
            '& .MuiInputLabel-root.Mui-focused': {
              color: 'black',
            },
          }}
        >
          <MenuItem value="Visa">Visa</MenuItem>
          <MenuItem value="MasterCard">MasterCard</MenuItem>
          <MenuItem value="American Express">American Express</MenuItem>
          <MenuItem value="Mercado Pago">Mercado Pago</MenuItem>
          <MenuItem value="Efectivo">Efectivo</MenuItem>
        </Select>
      </FormControl>
      <FormControl variant="outlined" fullWidth={false} margin="normal" sx={{
        '& .MuiOutlinedInput-root': {
          backgroundColor: 'white',
          '& fieldset': {
            borderColor: '#777777',
            color: '#777777',
          },
          '&:hover fieldset': {
            borderColor: '#777777',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#777777',
          },
        },
        '& .MuiInputLabel-root': {
          color: 'black',
        },
        '& .MuiInputLabel-root.Mui-focused': {
          color: 'black',
        },
      }}>
        <InputLabel>Banco</InputLabel>
        <Select
          value={formData.banco}
          onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
          label="Banco"
          required
        >
          <MenuItem value="Santander">Santander</MenuItem>
          <MenuItem value="Nacion">Nacion</MenuItem>
          <MenuItem value="Galicia">Galicia</MenuItem>
          <MenuItem value="BBVA">BBVA</MenuItem>
          <MenuItem value="HSBC">HSBC</MenuItem>
          <MenuItem value="Credicoop">Credicoop</MenuItem>
          <MenuItem value="Patagonia">Patagonia</MenuItem>
          <MenuItem value="Supervielle">Supervielle</MenuItem>
          <MenuItem value="Hipotecario">Hipotecario</MenuItem>
          <MenuItem value="Citibank">Citibank</MenuItem>
          <MenuItem value="Itaú">Itaú</MenuItem>
          <MenuItem value="ICBC">ICBC</MenuItem>
          <MenuItem value="Banco Provincia">Banco Provincia</MenuItem>
          <MenuItem value="Banco Ciudad">Banco Ciudad</MenuItem>
          <MenuItem value="Ninguno">Ninguno</MenuItem>
        </Select>
      </FormControl>
    </>
  );

  const renderRepetitivoFields = () => (
    <>
      <TextField
        label="Rep. en el mes"
        type="number"
        variant="outlined"
        value={formData.cantidad}
        onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
        min="0"
        required
        fullWidth={false}
        margin="normal"
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'white',
            '& fieldset': {
              borderColor: '#777777',
              color: '#777777',
            },
            '&:hover fieldset': {
              borderColor: '#777777',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#777777',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'black',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'black',
          },
        }}
      />
      <TextField
        label="Periodo en meses"
        type="number"
        variant="outlined"
        value={formData.cuotas}
        onChange={(e) => setFormData({ ...formData, cuotas: e.target.value })}
        min="0"
        required
        fullWidth={false}
        margin="normal"
        sx={{
          '& .MuiOutlinedInput-root': {
            backgroundColor: 'white',
            '& fieldset': {
              borderColor: '#777777',
              color: '#777777',
            },
            '&:hover fieldset': {
              borderColor: '#777777',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#777777',
            },
          },
          '& .MuiInputLabel-root': {
            color: 'black',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'black',
          },
        }}
      />
    </>
  );

  return (
    <div className="modal-overlay">
      <div
        id="modal-agregar"
        className="modal-content"
        style={{
          height: modalType === 'vencimiento' ? '300px' : modalType === 'fondos' ? '220px' : modalType === 'eliminar' ? '300px' : modalType === 'reporte' ? '90%' : '500px',
          width: modalType === 'vencimiento' ? '500px' : modalType === 'reporte' ? '90%' : '400px',
          backgroundColor:
            modalType === 'nuevo'
              ? '#76ff69ce'
              : modalType === 'repetitivo'
                ? '#ffc170d2'
                : modalType === 'fondos'
                  ? '#55f2f798'
                  : modalType === 'vencimiento'
                    ? '#e773d4c2'
                    : modalType === 'eliminar'
                      ? '#ff8b8bd7'
                      : modalType === 'editar'
                        ? '#3b80ffd5'
                        : modalType === 'reporte'
                          ? '#9965ffd6' : 'white',
        }}
      >
        <div className="eliminar-align">
          <span id="eliminar" className="close" onClick={() => handleCloseModal()}>
            <IoArrowBackCircle size={30} />
          </span>
        </div>
        <div className="modal-align">
          <h2>
            {modalType === 'nuevo' && 'Agregar Nuevo'}
            {modalType === 'repetitivo' && 'Agregar Repetitivo'}
            {modalType === 'fondos' && 'Agregar Fondos'}
            {modalType === 'vencimiento' && 'Vencimiento de Tarjeta'}
            {modalType === 'eliminar' && 'Confirmar Eliminación'}
            {modalType === 'editar' && 'Editar Registro'}
          </h2>
          <form className='formDatos' onSubmit={(e) => e.preventDefault()}>
            {(modalType === 'nuevo' || modalType === 'repetitivo' || modalType === 'editar') && (
              <>
                {renderCommonFields()}
                {(modalType === 'nuevo' || modalType === 'editar') && (
                  <>
                    <FormControl variant="outlined" fullWidth={false} margin="normal" sx={{
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: 'white',
                        '& fieldset': {
                          borderColor: '#777777',
                          color: '#777777',
                        },
                        '&:hover fieldset': {
                          borderColor: '#777777',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#777777',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: 'black',
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: 'black',
                      },
                    }}>
                      <InputLabel>Tipo</InputLabel>
                      <Select
                        value={formData.tipo}
                        onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                        label="Tipo"
                        required
                      >
                        <MenuItem value="debito">Débito</MenuItem>
                        <MenuItem value="credito">Crédito</MenuItem>
                      </Select>
                    </FormControl>
                    {formData.tipo === 'credito' && (
                      <TextField
                        label="Cuotas"
                        type="number"
                        variant="outlined"
                        value={formData.cuotas}
                        onChange={(e) => setFormData({ ...formData, cuotas: e.target.value })}
                        min="0"
                        required
                        fullWidth={false}
                        margin="normal"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: 'white',
                            '& fieldset': {
                              borderColor: '#777777',
                              color: '#777777',
                            },
                            '&:hover fieldset': {
                              borderColor: '#777777',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#777777',
                            },
                          },
                          '& .MuiInputLabel-root': {
                            color: 'black',
                          },
                          '& .MuiInputLabel-root.Mui-focused': {
                            color: 'black',
                          },
                        }}
                      />
                    )}
                  </>
                )}
                {(modalType === 'repetitivo' || formData.isFijo) && (
                  <>
                    <TextField
                      label="Rep. en el mes"
                      type="number"
                      variant="outlined"
                      value={formData.cantidad}
                      onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                      min="0"
                      required
                      fullWidth={false}
                      margin="normal"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                          '& fieldset': {
                            borderColor: '#777777',
                            color: '#777777',
                          },
                          '&:hover fieldset': {
                            borderColor: '#777777',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#777777',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'black',
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: 'black',
                        },
                      }}
                    />
                    <TextField
                      label="Periodo en meses"
                      type="number"
                      variant="outlined"
                      value={formData.cuotas}
                      onChange={(e) => setFormData({ ...formData, cuotas: e.target.value })}
                      min="0"
                      required
                      fullWidth={false}
                      margin="normal"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: 'white',
                          '& fieldset': {
                            borderColor: '#777777',
                            color: '#777777',
                          },
                          '&:hover fieldset': {
                            borderColor: '#777777',
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: '#777777',
                          },
                        },
                        '& .MuiInputLabel-root': {
                          color: 'black',
                        },
                        '& .MuiInputLabel-root.Mui-focused': {
                          color: 'black',
                        },
                      }}
                    />
                  </>
                )}
                <TextField
                  label="Precio"
                  type="number"
                  step="0.01"
                  variant="outlined"
                  value={formData.precio}
                  onChange={(e) => setFormData({ ...formData, precio: e.target.value })}
                  min="0"
                  required
                  fullWidth={false}
                  margin="normal"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                      '& fieldset': {
                        borderColor: '#777777',
                        color: '#777777',
                      },
                      '&:hover fieldset': {
                        borderColor: '#777777',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#777777',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'black',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'black',
                    },
                  }}
                />
              </>
            )}
            {modalType === 'fondos' && (
              <>
                <TextField
                  label="Fondos"
                  type="number"
                  step="0.01"
                  variant="outlined"
                  value={mydata.fondos}
                  onChange={(e) => setMyData({ ...mydata, fondos: e.target.value })}
                  min="0"
                  required
                  fullWidth
                  margin="normal"
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                      '& fieldset': {
                        borderColor: '#777777',
                        color: '#777777',
                      },
                      '&:hover fieldset': {
                        borderColor: '#777777',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#777777',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'black',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'black',
                    },
                  }}
                />
              </>
            )}
            {modalType === 'vencimiento' && (
              <div className="modal-align">
                {!mydata.vencimiento || mydata.vencimiento === '' || mydata.vencimiento < new Date().toISOString().split('T')[0] ?
                  <p style={{ color: "#ffbf00" }}>¡Atención! Es necesario agregar la fecha de vencimiento de tu tarjeta</p>
                  : null
                }
                <TextField
                  label="Fecha de vencimiento"
                  type="date"
                  variant="outlined"
                  value={mydata.vencimiento}
                  onChange={(e) => setMyData({ ...mydata, vencimiento: e.target.value })}
                  required
                  fullWidth
                  margin="normal"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white',
                      '& fieldset': {
                        borderColor: '#777777',
                        color: '#777777',
                      },
                      '&:hover fieldset': {
                        borderColor: '#777777',
                      },
                      '&.Mui-focused fieldset': {
                        borderColor: '#777777',
                      },
                    },
                    '& .MuiInputLabel-root': {
                      color: 'black',
                    },
                    '& .MuiInputLabel-root.Mui-focused': {
                      color: 'black',
                    },
                  }}
                />
              </div>
            )}
          </form>
          {modalType !== 'eliminar' && modalType !== 'reporte' && (
            <div className="alignBottom">
              <Button
                variant="contained"
                color="primary"
                onClick={
                  modalType === 'nuevo' || modalType === 'repetitivo' ? handleSubmit : modalType === 'editar' ? handleEdit : modalType === 'fondos' ? () => handleAgregarFondos({ target: { value: mydata.fondos } }) : () => handleChangeVencimiento({ target: { value: mydata.vencimiento } })}
                fullWidth
              >
                Guardar
              </Button>
            </div>
          )}
          {modalType === 'eliminar' && (
            <>
              <p>¿ Estás seguro de que deseas eliminar: <span style={{ color: 'red' }}>{formData.objeto}</span> ?</p>
              <div className="button-group">
                <Button variant="contained" color="primary" onClick={() => setModalVisible(false)}>Cancelar</Button>
                <Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
              </div>
            </>
          )}
          {
            modalType === 'reporte' && (
              <div>
                <Dashboard data={data} mydata={mydata} />
              </div>
            )
          }
        </div>
      </div>
    </div>
  );
}

export default Modal;