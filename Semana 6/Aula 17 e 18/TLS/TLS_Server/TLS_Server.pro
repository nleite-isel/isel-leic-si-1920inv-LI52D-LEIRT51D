TEMPLATE = app
CONFIG += console
CONFIG -= app_bundle
CONFIG -= qt

SOURCES += \
    tls_server.c

unix|win32: LIBS += -lssl

unix|win32: LIBS += -lcrypto
